import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { orderApi, type OrderListItem } from '../api/orders';
import { formatCurrency, formatDateTime, ORDER_STATUS_TEXT } from '../utils/display';

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await orderApi.getOrderById(id);
        setOrder(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || '订单详情加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) return <div className="loading">订单详情加载中...</div>;
  if (!order) return <div className="empty-state">{error || '订单不存在。'}</div>;

  const from = searchParams.get('from');
  const backTarget =
    from === 'admin-arbitration'
      ? { path: '/admin/orders/arbitration', label: '返回订单仲裁' }
      : from === 'seller-orders'
        ? { path: '/seller/orders', label: '返回订单管理' }
        : { path: '/orders', label: '返回我的订单' };

  return (
    <div className="page order-detail-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Order Detail</p>
          <h1>订单详情</h1>
          <p className="section-copy">查看成交商品、买卖双方、履约时间和售后信息。</p>
        </div>
        <Link to={backTarget.path} className="btn">
          {backTarget.label}
        </Link>
      </div>

      <div className="order-detail-layout">
        <section className="editor-preview">
          <div className="editor-preview-image">
            {order.auction.product.images[0] ? (
              <img src={order.auction.product.images[0]} alt={order.auction.product.name} />
            ) : (
              <div className="product-cover-empty">No Image</div>
            )}
          </div>
          <div className="editor-preview-body">
            <span className="product-category">{order.auction.product.category}</span>
            <h3>{order.auction.product.name}</h3>
            <p>{order.auction.product.description || '暂无商品描述'}</p>
          </div>
        </section>

        <section className="profile-card order-detail-card">
          <div className="profile-item">
            <span className="label">订单状态</span>
            <span className="value">{ORDER_STATUS_TEXT[order.status]}</span>
          </div>
          <div className="profile-item">
            <span className="label">成交价</span>
            <span className="value">{formatCurrency(order.finalPrice)}</span>
          </div>
          <div className="profile-item">
            <span className="label">买家</span>
            <span className="value">{order.buyer?.username || '未知'}</span>
          </div>
          <div className="profile-item">
            <span className="label">卖家</span>
            <span className="value">{order.seller?.username || '未知'}</span>
          </div>
          <div className="profile-item">
            <span className="label">生成时间</span>
            <span className="value">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="profile-item">
            <span className="label">支付时间</span>
            <span className="value">{formatDateTime(order.paymentTime)}</span>
          </div>
          <div className="profile-item">
            <span className="label">发货时间</span>
            <span className="value">{formatDateTime(order.shippedAt)}</span>
          </div>
          <div className="profile-item">
            <span className="label">自动收货时间</span>
            <span className="value">{formatDateTime(order.autoConfirmAt)}</span>
          </div>
          {order.refundReason ? (
            <div className="profile-item">
              <span className="label">退款原因</span>
              <span className="value">{order.refundReason}</span>
            </div>
          ) : null}
          {order.disputeReason ? (
            <div className="profile-item">
              <span className="label">争议/仲裁备注</span>
              <span className="value">{order.disputeReason}</span>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
