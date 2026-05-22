import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Product } from '@liveauctioner/shared';
import { auctionApi } from '../api/auctions';
import { productApi } from '../api/products';

const INITIAL_FORM = {
  productId: '',
  startPrice: '1000',
  reservePrice: '',
  minIncrement: '100',
  startTime: '',
  endTime: '',
};

export default function AuctionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const productsRes = await productApi.getMyProducts({ status: 'APPROVED', limit: 100 });
        setProducts(productsRes.data.data.products);

        if (id) {
          const detailRes = await auctionApi.getSellerAuctionById(id);
          const detail = detailRes.data.data;
          setForm({
            productId: detail.productId,
            startPrice: String(detail.startPrice),
            reservePrice: detail.reservePrice ? String(detail.reservePrice) : '',
            minIncrement: String(detail.minIncrement),
            startTime: detail.startTime ? detail.startTime.slice(0, 16) : '',
            endTime: detail.endTime ? detail.endTime.slice(0, 16) : '',
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || '拍卖信息加载失败');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        productId: form.productId,
        startPrice: Number(form.startPrice),
        reservePrice: form.reservePrice ? Number(form.reservePrice) : undefined,
        minIncrement: Number(form.minIncrement),
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      };

      if (isEdit && id) {
        await auctionApi.updateAuction(id, payload);
      } else {
        await auctionApi.createAuction(payload);
      }

      navigate('/seller/auctions');
    } catch (err: any) {
      setError(err.response?.data?.message || '拍卖保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">拍卖信息加载中...</div>;

  return (
    <div className="page auction-editor-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Seller Console</p>
          <h1>{isEdit ? '编辑拍卖' : '创建拍卖'}</h1>
          <p className="section-copy">为已审核通过的商品配置起拍价、保留价和拍卖时间窗口。</p>
        </div>
        <Link to="/seller/auctions" className="btn">
          返回拍卖管理
        </Link>
      </div>

      <div className="editor-layout">
        <form className="editor-card" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label>选择商品</label>
            <select
              value={form.productId}
              onChange={(e) => setForm((current) => ({ ...current, productId: e.target.value }))}
              required
              disabled={isEdit}
            >
              <option value="">请选择已审核通过的商品</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>起拍价</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.startPrice}
                onChange={(e) => setForm((current) => ({ ...current, startPrice: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>保留价</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.reservePrice}
                onChange={(e) => setForm((current) => ({ ...current, reservePrice: e.target.value }))}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>最小加价幅度</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.minIncrement}
                onChange={(e) => setForm((current) => ({ ...current, minIncrement: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>开始时间</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>结束时间</label>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? '保存中...' : isEdit ? '更新拍卖' : '创建拍卖'}
          </button>
        </form>

        <aside className="editor-side-card">
          <div className="editor-tip-card">
            <h3>排期建议</h3>
            <p>起拍价建议低于预期成交价，用于提升参与意愿；保留价用于控制低价流拍风险。</p>
            <p>最小加价幅度过大，会降低参与频次；过小，则会拉长拍卖时间并增加操作噪音。</p>
          </div>
          <div className="editor-tip-card">
            <h3>当前可选商品</h3>
            <p>仅展示已审核通过的商品，共 {products.length} 个，可直接用于创建拍卖。</p>
            <p>编辑状态下不允许切换商品，避免拍卖与商品绑定关系被随意改写。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
