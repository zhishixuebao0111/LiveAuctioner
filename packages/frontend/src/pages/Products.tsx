import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@liveauctioner/shared';
import { productApi } from '../api/products';
import { formatDate } from '../utils/display';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = async (nextKeyword = keyword, nextCategory = category) => {
    setLoading(true);
    setError('');

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productApi.searchProducts({ keyword: nextKeyword, category: nextCategory, limit: 24 }),
        productApi.getCategories(),
      ]);

      setProducts(productsRes.data.data.products);
      setCategories(categoriesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="page products-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Auction Catalog</p>
          <h1>商品广场</h1>
          <p className="section-copy">先把可售商品池做起来，后面拍卖大厅才能有真实供给。</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索商品名称"
        />
        <select
          className="filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => loadProducts(keyword, category)}>
          搜索
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">商品加载中...</div> : null}

      {!loading && (
        <>
          <div className="stat-strip">
            <div className="stat-card">
              <span>展示商品数</span>
              <strong>{products.length}</strong>
            </div>
            <div className="stat-card">
              <span>可选分类</span>
              <strong>{categories.length}</strong>
            </div>
            <div className="stat-card">
              <span>当前视图</span>
              <strong>商品池</strong>
            </div>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-cover">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} />
                  ) : (
                    <div className="product-cover-empty">No Image</div>
                  )}
                </div>
                <div className="product-body">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description || '暂无商品描述'}</p>
                  <div className="product-card-meta">
                    <span>建档时间</span>
                    <span>{formatDate(product.createdAt)}</span>
                  </div>
                </div>
              </article>
            ))}
            {!products.length && <div className="empty-state">当前没有可展示的商品。</div>}
          </div>
        </>
      )}

      <div className="section-foot">
        <Link to="/" className="btn btn-secondary">
          返回首页
        </Link>
      </div>
    </div>
  );
}
