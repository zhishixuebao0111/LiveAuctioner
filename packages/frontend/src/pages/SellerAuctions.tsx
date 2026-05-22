import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auctionApi, type AuctionListItem } from '../api/auctions';
import { AUCTION_STATUS_TEXT, formatCurrency, formatDateTime } from '../utils/display';

export default function SellerAuctions() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAuctions = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await auctionApi.getSellerAuctions({ limit: 50 });
      setAuctions(res.data.data.auctions);
    } catch (err: any) {
      setError(err.response?.data?.message || '拍卖加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  const handleStart = async (id: string) => {
    try {
      await auctionApi.startAuction(id);
      await loadAuctions();
    } catch (err: any) {
      setError(err.response?.data?.message || '开始拍卖失败');
    }
  };

  const handleEnd = async (id: string) => {
    try {
      await auctionApi.endAuction(id);
      await loadAuctions();
    } catch (err: any) {
      setError(err.response?.data?.message || '结束拍卖失败');
    }
  };

  return (
    <div className="page seller-auctions-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Seller Console</p>
          <h1>拍卖管理</h1>
          <p className="section-copy">在这里安排拍卖排期、控制开拍与落锤，并观察出价走势。</p>
        </div>
        <Link to="/seller/auctions/new" className="btn btn-primary">
          创建拍卖
        </Link>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">拍卖加载中...</div> : null}

      {!loading && (
        <>
          <div className="stat-strip">
            <div className="stat-card">
              <span>拍卖总数</span>
              <strong>{auctions.length}</strong>
            </div>
            <div className="stat-card">
              <span>待开始</span>
              <strong>{auctions.filter((auction) => auction.status === 'PENDING').length}</strong>
            </div>
            <div className="stat-card">
              <span>进行中</span>
              <strong>{auctions.filter((auction) => auction.status === 'ONGOING').length}</strong>
            </div>
          </div>

          <div className="seller-list">
            {auctions.map((auction) => (
              <article key={auction.id} className="seller-card seller-card-rich">
                <div className="seller-thumb">
                  {auction.product.images[0] ? (
                    <img src={auction.product.images[0]} alt={auction.product.name} />
                  ) : (
                    <div className="product-cover-empty">No Image</div>
                  )}
                </div>
                <div className="seller-card-main">
                  <div className="seller-card-meta">
                    <span className={`status-badge status-${auction.status.toLowerCase()}`}>
                      {AUCTION_STATUS_TEXT[auction.status]}
                    </span>
                    <span>{auction.product.category}</span>
                    <span>{formatDateTime(auction.endTime)}</span>
                  </div>
                  <h3>{auction.product.name}</h3>
                  <p>
                    当前价 {formatCurrency(auction.currentPrice)} / 起拍价 {formatCurrency(auction.startPrice)}
                  </p>
                  <p>最小加价 {formatCurrency(auction.minIncrement)} / {auction.bidCount} 次出价</p>
                </div>
                <div className="seller-card-actions">
                  {auction.status === 'PENDING' && (
                    <>
                      <Link to={`/seller/auctions/${auction.id}/edit`} className="btn btn-secondary">
                        编辑
                      </Link>
                      <button className="btn btn-primary" onClick={() => handleStart(auction.id)}>
                        开始拍卖
                      </button>
                    </>
                  )}
                  {auction.status === 'ONGOING' && (
                    <>
                      <Link to={`/auctions/${auction.id}`} className="btn btn-secondary">
                        查看大厅
                      </Link>
                      <button className="btn btn-danger" onClick={() => handleEnd(auction.id)}>
                        落锤结束
                      </button>
                    </>
                  )}
                  {auction.status === 'ENDED' && (
                    <Link to={`/auctions/${auction.id}`} className="btn btn-secondary">
                      查看结果
                    </Link>
                  )}
                </div>
              </article>
            ))}
            {!auctions.length && <div className="empty-state">你还没有创建拍卖。</div>}
          </div>
        </>
      )}
    </div>
  );
}
