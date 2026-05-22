import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { auctionApi, type AuctionListItem, type BidRecord } from '../api/auctions';
import { authApi, type CreditLevel } from '../api/auth';
import { useAuthStore } from '../stores/auth';
import {
  AUCTION_STATUS_TEXT,
  formatCountdown,
  formatCurrency,
  formatDateTime,
  getInitial,
  getCreditLevelInfo,
} from '../utils/display';

const VISIBLE_BID_COUNT = 6;

interface DepositPromptProps {
  creditLevel: CreditLevel;
  bidPrice: number;
  userBalance: number;
  userFrozenBalance: number;
}

function DepositPrompt({ creditLevel, bidPrice, userBalance }: DepositPromptProps) {
  const levelInfo = getCreditLevelInfo(creditLevel.creditScore);
  const requiredDeposit = Math.ceil(bidPrice * creditLevel.depositRate * 100) / 100;
  const availableBalance = userBalance;
  const isInsufficient = availableBalance < requiredDeposit;

  if (creditLevel.isBanned) {
    return (
      <div className="deposit-prompt deposit-prompt-danger">
        <div className="deposit-prompt-header">
          <span className="deposit-prompt-icon">!</span>
          <strong>信用分过低，已被封禁</strong>
        </div>
        <p>您的信用分 ({creditLevel.creditScore}) 低于 20，已被封禁，无法参与竞拍。请通过正常交易提升信用分。</p>
      </div>
    );
  }

  if (creditLevel.isSeverelyRestricted) {
    return (
      <div className="deposit-prompt deposit-prompt-danger">
        <div className="deposit-prompt-header">
          <span className="deposit-prompt-icon">!</span>
          <strong>信用分过低，只能浏览不能竞拍</strong>
        </div>
        <p>您的信用分 ({creditLevel.creditScore}) 为 20-39 分，当前只能浏览拍品不能参与竞拍。请通过正常交易提升信用分。</p>
      </div>
    );
  }

  return (
    <div className={`deposit-prompt deposit-prompt-${levelInfo.color}`}>
      <div className="deposit-prompt-header">
        <span className="deposit-prompt-icon">%</span>
        <strong>保证金预估</strong>
        <span className={`credit-level-badge credit-level-${levelInfo.color}`}>{levelInfo.label}</span>
      </div>
      <div className="deposit-prompt-details">
        <div className="deposit-prompt-row">
          <span>出价金额</span>
          <span>{formatCurrency(bidPrice)}</span>
        </div>
        <div className="deposit-prompt-row">
          <span>保证金比例</span>
          <span>{creditLevel.depositRate * 100}%</span>
        </div>
        <div className="deposit-prompt-row deposit-prompt-total">
          <span>需冻结保证金</span>
          <span>{formatCurrency(requiredDeposit)}</span>
        </div>
        <div className="deposit-prompt-row">
          <span>可用余额</span>
          <span className={isInsufficient ? 'text-danger' : ''}>{formatCurrency(availableBalance)}</span>
        </div>
      </div>
      {isInsufficient && (
        <div className="deposit-prompt-warning">
          余额不足，请先 <Link to="/profile">充值</Link> 后再出价。
        </div>
      )}
      {creditLevel.isRestricted && (
        <div className="deposit-prompt-warning">
          信用分较低，每周最多同时参与 3 个拍卖。
        </div>
      )}
    </div>
  );
}

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [auction, setAuction] = useState<AuctionListItem | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [related, setRelated] = useState<AuctionListItem[]>([]);
  const [bidPrice, setBidPrice] = useState('');
  const [countdown, setCountdown] = useState('未开始');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [creditLevel, setCreditLevel] = useState<CreditLevel | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadDetail = async () => {
      setLoading(true);
      setError('');

      try {
        const [detailRes, bidsRes, relatedRes] = await Promise.all([
          auctionApi.getAuctionById(id),
          auctionApi.getAuctionBids(id),
          auctionApi.getHotAuctions(),
        ]);

        const detail = detailRes.data.data;
        setAuction(detail);
        setBids(bidsRes.data.data);
        setRelated(relatedRes.data.data.filter((item) => item.id !== detail.id).slice(0, 8));
        setBidPrice(String(detail.currentPrice + detail.minIncrement));
      } catch (err: any) {
        setError(err.response?.data?.message || '拍卖详情加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  useEffect(() => {
    if (!auction?.endTime) {
      setCountdown(auction?.status === 'PENDING' ? '等待开始' : '未设置结束时间');
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(auction.endTime));
    }, 1000);

    setCountdown(formatCountdown(auction.endTime));

    return () => window.clearInterval(timer);
  }, [auction?.endTime, auction?.status]);

  useEffect(() => {
    if (!token) return;
    authApi.getCreditLevel().then((res) => setCreditLevel(res.data.data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!id) return;

    const socket = io(window.location.origin, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socket.emit('join_auction', id);

    socket.on('auction_update', (nextAuction: AuctionListItem) => {
      setAuction((current) => (current && current.id === nextAuction.id ? { ...current, ...nextAuction } : current));
      setBidPrice(String(nextAuction.currentPrice + nextAuction.minIncrement));
    });

    socket.on('bid_placed', (bid: BidRecord) => {
      setBids((current) => [bid, ...current].slice(0, 20));
    });

    socket.on('auction_ended', ({ auction: endedAuction }: { auction: AuctionListItem }) => {
      setAuction((current) =>
        current && current.id === endedAuction.id ? { ...current, ...endedAuction } : current,
      );
      setPlacing(false);
    });

    socket.on('online_count', ({ count }: { auctionId: string; count: number }) => {
      setOnlineCount(count);
    });

    socket.on('error', (message: string) => {
      setPlacing(false);
      setError(message);
    });

    return () => {
      socket.emit('leave_auction', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token]);

  const handlePlaceBid = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || !socketRef.current) return;

    setPlacing(true);
    setError('');

    socketRef.current.emit(
      'place_bid',
      { auctionId: id, price: Number(bidPrice) },
      () => {
        setPlacing(false);
      },
    );

    window.setTimeout(() => setPlacing(false), 800);
  };

  if (loading) return <div className="loading">拍卖详情加载中...</div>;
  if (!auction) return <div className="empty-state">拍卖不存在。</div>;

  const visibleBids = bids.slice(0, VISIBLE_BID_COUNT);

  return (
    <div className="page auction-detail-page">
      <div className="auction-detail-layout">
        <section className="auction-hero-card">
          <div className="auction-hero-image">
            {auction.product.images[0] ? (
              <img src={auction.product.images[0]} alt={auction.product.name} />
            ) : (
              <div className="product-cover-empty">No Image</div>
            )}
          </div>
          <div className="auction-hero-caption">
            <span className="product-category">{auction.product.category}</span>
            <h1>{auction.product.name}</h1>
            <p>{auction.product.description || '暂无商品描述'}</p>

            <div className="detail-info-grid">
              <div className="detail-info-card">
                <span>卖家</span>
                <strong>{auction.seller?.username || '未知卖家'}</strong>
              </div>
              <div className="detail-info-card">
                <span>开始时间</span>
                <strong>{formatDateTime(auction.startTime)}</strong>
              </div>
              <div className="detail-info-card">
                <span>结束时间</span>
                <strong>{formatDateTime(auction.endTime)}</strong>
              </div>
              <div className="detail-info-card">
                <span>当前领先</span>
                <strong>{auction.currentBidder?.username || '暂无'}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className="bid-panel">
          <div className="bid-panel-head">
            <span className={`status-badge status-${auction.status.toLowerCase()}`}>
              {AUCTION_STATUS_TEXT[auction.status]}
            </span>
            <span className="bid-panel-seller">卖家：{auction.seller?.username || '未知卖家'}</span>
          </div>

          <div className="price-block">
            <span>当前最高价</span>
            <strong>{formatCurrency(auction.currentPrice)}</strong>
          </div>

          <div className="countdown-block">
            <span>倒计时</span>
            <strong>{countdown}</strong>
          </div>

          <div className="panel-meta-grid">
            <div>
              <span>加价幅度</span>
              <strong>{formatCurrency(auction.minIncrement)}</strong>
            </div>
            <div>
              <span>出价次数</span>
              <strong>{auction.bidCount}</strong>
            </div>
            <div>
              <span>起拍价</span>
              <strong>{formatCurrency(auction.startPrice)}</strong>
            </div>
            <div>
              <span>保留价</span>
              <strong>{auction.reservePrice ? formatCurrency(auction.reservePrice) : '未设置'}</strong>
            </div>
            <div>
              <span>在线人数</span>
              <strong>{onlineCount}</strong>
            </div>
          </div>

          <div className="bid-form">
            <input
              className="bid-input"
              type="number"
              step="0.01"
              min={auction.currentPrice + auction.minIncrement}
              value={bidPrice}
              onChange={(e) => setBidPrice(e.target.value)}
              placeholder="输入出价金额"
            />
            <button
              className="btn btn-primary bid-submit-btn"
              onClick={handlePlaceBid}
              disabled={placing || auction.status !== 'ONGOING' || user?.id === auction.sellerId}
            >
              {placing ? '出价中...' : '立即出价'}
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {!token ? <div className="inline-tip">登录后才能参与出价。</div> : null}
          {user?.id === auction.sellerId ? <div className="inline-tip">当前账号是卖家账号，不能参与自己的拍卖。</div> : null}

          {/* 信用分和保证金提示 */}
          {token && user && user.id !== auction.sellerId && creditLevel && auction.status === 'ONGOING' && (
            <DepositPrompt
              creditLevel={creditLevel}
              bidPrice={Number(bidPrice)}
              userBalance={user.balance}
              userFrozenBalance={user.frozenBalance}
            />
          )}

          <div className="bid-history-card">
            <div className="history-head">
              <h3>出价记录</h3>
              <span>最近 {visibleBids.length} 条 / 共 {auction.bidCount} 次</span>
            </div>
            <div className="bid-history-list">
              {visibleBids.map((bid) => (
                <div key={bid.id} className="bid-history-row">
                  <div className="bidder-avatar">{getInitial(bid.bidder?.username)}</div>
                  <div className="bid-history-main">
                    <strong>{bid.bidder?.username || '匿名用户'}</strong>
                    <span>{formatDateTime(bid.bidTime)}</span>
                  </div>
                  <div className="bid-history-price">{formatCurrency(bid.price)}</div>
                </div>
              ))}
              {!bids.length && <div className="empty-inline">暂无出价记录</div>}
            </div>
          </div>
        </aside>
      </div>

      <section className="related-strip">
        <div className="section-head">
          <div>
            <p className="eyebrow">More Lots</p>
            <h2>其他拍品</h2>
          </div>
          <Link to="/auctions" className="btn">
            返回拍卖列表
          </Link>
        </div>

        <div className="related-scroll">
          {related.map((item) => (
            <Link key={item.id} to={`/auctions/${item.id}`} className="related-card">
              <div className="related-thumb">
                {item.product.images[0] ? (
                  <img src={item.product.images[0]} alt={item.product.name} />
                ) : (
                  <div className="product-cover-empty">No Image</div>
                )}
              </div>
              <div className="related-body">
                <h4>{item.product.name}</h4>
                <p>{formatCurrency(item.currentPrice)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
