import { useEffect, useState } from 'react';
import type { OrderStatus } from '@liveauctioner/shared';
import { Link } from 'react-router-dom';
import { orderApi, type OrderListItem } from '../api/orders';
import { formatCurrency, formatDateTime, ORDER_STATUS_TEXT } from '../utils/display';

export default function SellerOrders() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  const loadOrders = async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const res = await orderApi.getSellerOrders({
        limit: 50,
        status: nextStatus || undefined,
      });
      setOrders(res.data.data.orders);
    } catch (err: any) {
      setError(err.response?.data?.message || '卖家订单加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const runAction = async (orderId: string, action: () => Promise<unknown>) => {
    setActingId(orderId);
    setError('');

    try {
      await action();
      await loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || '订单操作失败');
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="page seller-orders-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Seller Orders</p>
          <h1>订单管理</h1>
          <p className="section-copy">处理买家支付后的发货和售后争议，保持拍卖成交后的履约闭环。</p>
        </div>
      </div>

      <div className="filter-bar compact">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
        >
          <option value="">全部状态</option>
          {Object.entries(ORDER_STATUS_TEXT).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => loadOrders(status)}>
          筛选
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">卖家订单加载中...</div> : null}

      {!loading && (
        <div className="seller-list">
          {orders.map((order) => (
            <article key={order.id} className="seller-card seller-card-rich">
              <div className="seller-thumb">
                {order.auction.product.images[0] ? (
                  <img src={order.auction.product.images[0]} alt={order.auction.product.name} />
                ) : (
                  <div className="product-cover-empty">No Image</div>
                )}
              </div>
              <div className="seller-card-main">
                <div className="seller-card-meta">
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {ORDER_STATUS_TEXT[order.status]}
                  </span>
                  <span>买家：{order.buyer?.username || '未知'}</span>
                  <span>生成于 {formatDateTime(order.createdAt)}</span>
                </div>
                <h3>{order.auction.product.name}</h3>
                <p>成交价：{formatCurrency(order.finalPrice)}</p>
                {order.paymentTime ? <p>支付时间：{formatDateTime(order.paymentTime)}</p> : null}
                {order.shippedAt ? <p>发货时间：{formatDateTime(order.shippedAt)}</p> : null}
                {order.refundReason ? <p className="inline-tip">退款原因：{order.refundReason}</p> : null}
                {order.disputeReason ? <p className="inline-tip">争议备注：{order.disputeReason}</p> : null}
              </div>
              <div className="seller-card-actions">
                <Link to={`/orders/${order.id}?from=seller-orders`} className="btn btn-secondary">
                  详情
                </Link>
                {order.status === 'PAID' && (
                  <button
                    className="btn btn-primary"
                    disabled={actingId === order.id}
                    onClick={() => runAction(order.id, () => orderApi.shipOrder(order.id))}
                  >
                    发货
                  </button>
                )}
                {order.status === 'REFUND_PENDING' && (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={actingId === order.id}
                      onClick={() => {
                        const reason = window.prompt('请输入退款备注（可留空）', '卖家同意退款');
                        if (reason !== null) {
                          void runAction(order.id, () => orderApi.sellerApproveRefund(order.id, reason));
                        }
                      }}
                    >
                      同意退款
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={actingId === order.id}
                      onClick={() => {
                        const reason = window.prompt('请输入拒绝退款原因', '不同意退款，申请平台仲裁');
                        if (reason !== null) {
                          void runAction(order.id, () => orderApi.sellerRejectRefund(order.id, reason));
                        }
                      }}
                    >
                      拒绝退款
                    </button>
                  </>
                )}
                {['SHIPPED', 'CONFIRMED'].includes(order.status) && (
                  <button
                    className="btn btn-secondary"
                    disabled={actingId === order.id}
                    onClick={() => {
                      const reason = window.prompt('请输入争议说明', '需要平台介入处理');
                      if (reason) {
                        void runAction(order.id, () => orderApi.disputeOrder(order.id, reason));
                      }
                    }}
                  >
                    发起争议
                  </button>
                )}
              </div>
            </article>
          ))}
          {!orders.length && <div className="empty-state">暂无卖家订单。</div>}
        </div>
      )}
    </div>
  );
}
