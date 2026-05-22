import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuctionStatus } from '@liveauctioner/shared';
import { auctionApi, type AuctionListItem } from '../api/auctions';
import { AUCTION_STATUS_TEXT, formatCurrency, formatDateTime } from '../utils/display';

export default function Auctions() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAuctions = async (nextKeyword = keyword, nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const res = await auctionApi.getAuctions({
        keyword: nextKeyword,
        status: nextStatus as AuctionStatus | undefined,
        limit: 24,
      });
      setAuctions(res.data.data.auctions);
    } catch (err: any) {
      setError(err.response?.data?.message || '拍卖列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  return (
    <div className="page auctions-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Auction Market</p>
          <h1>竞拍大厅</h1>
          <p className="section-copy">聚焦高价值非标品，让价格在公开竞价里自然形成。列表页统一展示状态、当前价、结束时间和出价活跃度。</p>
        </div>
        <Link to="/seller/auctions" className="btn btn-secondary">卖家后台</Link>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索拍卖商品"
        />
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          {Object.entries(AUCTION_STATUS_TEXT).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => loadAuctions(keyword, status)}>
          搜索
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">拍卖加载中...</div> : null}

      {!loading && (
        <>
          <div className="stat-strip">
            <div className="stat-card">
              <span>拍卖数量</span>
              <strong>{auctions.length}</strong>
            </div>
            <div className="stat-card">
              <span>进行中</span>
              <strong>{auctions.filter((auction) => auction.status === 'ONGOING').length}</strong>
            </div>
            <div className="stat-card">
              <span>即将开始</span>
              <strong>{auctions.filter((auction) => auction.status === 'PENDING').length}</strong>
            </div>
          </div>

          <div className="auction-card-grid">
            {auctions.map((auction) => (
              <Link key={auction.id} to={`/auctions/${auction.id}`} className="auction-card-link">
                <article className="auction-card">
                  <div className="auction-card-cover">
                    {auction.product.images[0] ? (
                      <img src={auction.product.images[0]} alt={auction.product.name} />
                    ) : (
                      <div className="product-cover-empty">No Image</div>
                    )}
                  </div>
                  <div className="auction-card-body">
                    <div className="auction-card-topline">
                      <span className={`status-badge status-${auction.status.toLowerCase()}`}>
                        {AUCTION_STATUS_TEXT[auction.status]}
                      </span>
                      <span>{auction.product.category}</span>
                    </div>
                    <h3>{auction.product.name}</h3>
                    <div className="auction-price-line">
                      <span>当前价</span>
                      <strong>{formatCurrency(auction.currentPrice)}</strong>
                    </div>
                    <div className="auction-meta-line">
                      <span>加价幅度 {formatCurrency(auction.minIncrement)}</span>
                      <span>{auction.bidCount} 次出价</span>
                    </div>
                    <div className="auction-card-footer">
                      <span>结束时间</span>
                      <span>{formatDateTime(auction.endTime)}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
            {!auctions.length && <div className="empty-state">当前没有符合条件的拍卖。</div>}
          </div>
        </>
      )}
    </div>
  );
}
