import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { auctionApi, type AuctionListItem } from '../api/auctions';
import { useAuthStore } from '../stores/auth';
import { AUCTION_STATUS_TEXT, formatCurrency, formatDateTime } from '../utils/display';

const PLATFORM_FEATURES = [
  {
    title: '公开竞价',
    description: '围绕高价值非标品建立透明价格发现机制，避免一口价失真。',
  },
  {
    title: '实时状态同步',
    description: '竞拍进度、最高价与出价记录保持同屏更新，便于用户快速决策。',
  },
  {
    title: '卖家工作台',
    description: '商品建档、审核提交、拍卖排期与落锤操作集中在一套后台流程里。',
  },
];

export default function Home() {
  const { user } = useAuthStore();
  const [hotAuctions, setHotAuctions] = useState<AuctionListItem[]>([]);
  const [upcomingAuctions, setUpcomingAuctions] = useState<AuctionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);

      try {
        const [hotRes, upcomingRes] = await Promise.all([
          auctionApi.getHotAuctions(),
          auctionApi.getUpcomingAuctions(),
        ]);

        setHotAuctions(hotRes.data.data.slice(0, 4));
        setUpcomingAuctions(upcomingRes.data.data.slice(0, 3));
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const leadAuction = useMemo(
    () => hotAuctions[0] || upcomingAuctions[0] || null,
    [hotAuctions, upcomingAuctions],
  );

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="eyebrow">Auction Commerce System</div>
          <h1>为高价值商品提供更有效的成交方式</h1>
          <p className="home-hero-text">
            面向珠宝、二手奢侈品、藏品与其他非标品场景，用公开竞价替代静态定价，让交易过程更透明，成交价格更接近真实市场。
          </p>

          <div className="hero-actions">
            <Link to="/auctions" className="btn btn-primary btn-lg">进入竞拍大厅</Link>
            <Link to="/products" className="btn btn-secondary btn-lg">查看商品池</Link>
            {!user ? <Link to="/register" className="btn btn-ghost btn-lg">创建账号</Link> : null}
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>热门拍卖</span>
              <strong>{hotAuctions.length}</strong>
            </div>
            <div className="metric-card">
              <span>即将开始</span>
              <strong>{upcomingAuctions.length}</strong>
            </div>
            <div className="metric-card">
              <span>系统定位</span>
              <strong>纯电商拍卖</strong>
            </div>
          </div>
        </div>

        <aside className="hero-auction-panel">
          <div className="hero-panel-head">
            <span className="status-badge status-ongoing">
              {leadAuction ? AUCTION_STATUS_TEXT[leadAuction.status] : '精选拍品'}
            </span>
            <span className="hero-panel-label">本期焦点</span>
          </div>

          {leadAuction ? (
            <>
              <div className="hero-panel-image">
                {leadAuction.product.images[0] ? (
                  <img src={leadAuction.product.images[0]} alt={leadAuction.product.name} />
                ) : (
                  <div className="product-cover-empty">No Image</div>
                )}
              </div>
              <div className="hero-panel-body">
                <span className="product-category">{leadAuction.product.category}</span>
                <h2>{leadAuction.product.name}</h2>
                <div className="hero-price-row">
                  <span>当前最高价</span>
                  <strong>{formatCurrency(leadAuction.currentPrice)}</strong>
                </div>
                <div className="hero-panel-meta">
                  <span>最小加价 {formatCurrency(leadAuction.minIncrement)}</span>
                  <span>{leadAuction.bidCount} 次出价</span>
                </div>
                <div className="hero-panel-meta">
                  <span>结束时间</span>
                  <span>{formatDateTime(leadAuction.endTime)}</span>
                </div>
                <Link to={`/auctions/${leadAuction.id}`} className="btn btn-primary btn-block">
                  查看拍卖详情
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">当前还没有可展示的拍卖焦点。</div>
          )}
        </aside>
      </section>

      <section className="feature-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Core Value</p>
            <h2>前端重构后的页面基线</h2>
            <p className="section-copy">统一使用轻量化卡片、白灰底色和深蓝强调色，让商品页、拍卖页和卖家后台形成同一套产品语言。</p>
          </div>
        </div>

        <div className="feature-grid">
          {PLATFORM_FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Hot Auctions</p>
            <h2>热门拍卖</h2>
          </div>
          <Link to="/auctions" className="btn btn-secondary">查看全部</Link>
        </div>

        {loading ? <div className="loading">首页数据加载中...</div> : null}

        {!loading && (
          <div className="auction-card-grid">
            {hotAuctions.map((auction) => (
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
                      <span>{auction.bidCount} 次出价</span>
                      <span>{formatDateTime(auction.endTime)}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
            {!hotAuctions.length && <div className="empty-state">当前没有热门拍卖。</div>}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Seller Workflow</p>
            <h2>卖家侧操作路径</h2>
          </div>
          {(user?.role === 'SELLER' || user?.role === 'ADMIN') ? (
            <Link to="/seller/auctions" className="btn btn-primary">进入卖家后台</Link>
          ) : null}
        </div>

        <div className="timeline-grid">
          <article className="timeline-card">
            <span className="timeline-index">01</span>
            <h3>创建商品</h3>
            <p>先完成名称、分类、描述和图片建档，形成可审核的商品资产。</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-index">02</span>
            <h3>审核通过后建拍</h3>
            <p>为商品配置起拍价、保留价和拍卖时间窗口，进入待开始状态。</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-index">03</span>
            <h3>开始与落锤</h3>
            <p>开拍后由买家实时竞价，卖家侧负责控制开拍、结束与结果确认。</p>
          </article>
        </div>
      </section>
    </div>
  );
}
