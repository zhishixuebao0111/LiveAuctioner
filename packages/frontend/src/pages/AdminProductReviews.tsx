import { useEffect, useState } from 'react';
import type { ProductStatus } from '@liveauctioner/shared';
import { productApi, type ProductDetail } from '../api/products';
import { formatDate, PRODUCT_STATUS_TEXT } from '../utils/display';

export default function AdminProductReviews() {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [status, setStatus] = useState<ProductStatus | ''>('REVIEWING');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState('');
  const [error, setError] = useState('');

  const loadProducts = async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const res = await productApi.getAdminProducts({
        limit: 50,
        status: nextStatus || undefined,
      });
      setProducts(res.data.data.products as ProductDetail[]);
    } catch (err: any) {
      setError(err.response?.data?.message || '待审核商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleReview = async (
    productId: string,
    nextStatus: 'APPROVED' | 'REJECTED',
  ) => {
    const reviewNote =
      nextStatus === 'REJECTED'
        ? window.prompt('请输入驳回原因', '商品信息或图片不符合审核要求') || ''
        : '';

    if (nextStatus === 'REJECTED' && !reviewNote.trim()) {
      return;
    }

    setReviewingId(productId);
    setError('');

    try {
      await productApi.reviewProduct(productId, {
        status: nextStatus,
        reviewNote: reviewNote.trim() || undefined,
      });
      await loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || '审核操作失败');
    } finally {
      setReviewingId('');
    }
  };

  return (
    <div className="page admin-review-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>商品审核</h1>
          <p className="section-copy">集中处理商家提交的商品审核，通过后商品才能进入公开展示和拍卖创建流程。</p>
        </div>
      </div>

      <div className="filter-bar compact">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
        >
          <option value="">全部状态</option>
          {Object.entries(PRODUCT_STATUS_TEXT).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => loadProducts(status)}>
          筛选
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">待审核商品加载中...</div> : null}

      {!loading && (
        <div className="seller-list">
          {products.map((product) => (
            <article key={product.id} className="seller-card seller-card-rich">
              <div className="seller-thumb">
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.name} />
                ) : (
                  <div className="product-cover-empty">No Image</div>
                )}
              </div>
              <div className="seller-card-main">
                <div className="seller-card-meta">
                  <span className={`status-badge status-${product.status.toLowerCase()}`}>
                    {PRODUCT_STATUS_TEXT[product.status]}
                  </span>
                  <span>{product.category}</span>
                  <span>商家：{product.seller?.username || '未知'}</span>
                  <span>提交于 {formatDate(product.createdAt)}</span>
                </div>
                <h3>{product.name}</h3>
                <p>{product.description || '暂无商品描述'}</p>
                {product.reviewNote ? <p className="inline-tip">审核备注：{product.reviewNote}</p> : null}
              </div>
              <div className="seller-card-actions">
                {product.status === 'REVIEWING' ? (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={reviewingId === product.id}
                      onClick={() => handleReview(product.id, 'APPROVED')}
                    >
                      通过
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={reviewingId === product.id}
                      onClick={() => handleReview(product.id, 'REJECTED')}
                    >
                      驳回
                    </button>
                  </>
                ) : (
                  <span className="inline-tip">当前状态无需处理</span>
                )}
              </div>
            </article>
          ))}
          {!products.length && <div className="empty-state">没有符合条件的商品。</div>}
        </div>
      )}
    </div>
  );
}
