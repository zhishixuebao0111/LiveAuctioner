import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, ProductStatus } from '@liveauctioner/shared';
import { productApi } from '../api/products';
import { useAuthStore } from '../stores/auth';
import { formatDate, PRODUCT_STATUS_TEXT } from '../utils/display';

export default function SellerProducts() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const res = await productApi.getMyProducts({
        limit: 50,
        status: nextStatus as ProductStatus | undefined,
      });
      setProducts(res.data.data.products);
    } catch (err: any) {
      setError(err.response?.data?.message || '商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSubmitReview = async (id: string) => {
    try {
      await productApi.submitReview(id);
      await loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || '提交审核失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除这个商品吗？')) return;

    try {
      await productApi.deleteProduct(id);
      await loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  if (!user) return null;

  return (
    <div className="page seller-products-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Seller Console</p>
          <h1>商品管理</h1>
          <p className="section-copy">先把商品池整理好，后面才能进入拍卖创建和审核流。</p>
        </div>
        <Link to="/seller/products/new" className="btn btn-primary">
          新建商品
        </Link>
      </div>

      <div className="filter-bar compact">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
      {loading ? <div className="loading">商品加载中...</div> : null}

      {!loading && (
        <>
          <div className="stat-strip">
            <div className="stat-card">
              <span>商品总数</span>
              <strong>{products.length}</strong>
            </div>
            <div className="stat-card">
              <span>已通过</span>
              <strong>{products.filter((product) => product.status === 'APPROVED').length}</strong>
            </div>
            <div className="stat-card">
              <span>审核中</span>
              <strong>{products.filter((product) => product.status === 'REVIEWING').length}</strong>
            </div>
          </div>

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
                    <span>创建于 {formatDate(product.createdAt)}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description || '暂无商品描述'}</p>
                </div>
                <div className="seller-card-actions">
                  <Link to={`/seller/products/${product.id}/edit`} className="btn btn-secondary">
                    编辑
                  </Link>
                  {(product.status === 'DRAFT' || product.status === 'REJECTED') && (
                    <button className="btn btn-primary" onClick={() => handleSubmitReview(product.id)}>
                      提交审核
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => handleDelete(product.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
            {!products.length && <div className="empty-state">你还没有创建商品。</div>}
          </div>
        </>
      )}
    </div>
  );
}
