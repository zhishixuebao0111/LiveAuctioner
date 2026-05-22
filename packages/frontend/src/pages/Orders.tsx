import { useEffect, useState } from 'react';
import type { OrderStatus } from '@liveauctioner/shared';
import { Link } from 'react-router-dom';
import { orderApi, type OrderListItem } from '../api/orders';
import { useAuthStore } from '../stores/auth';
import { formatCurrency, formatDateTime, ORDER_STATUS_TEXT } from '../utils/display';

export default function Orders() {
  const { fetchProfile } = useAuthStore();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  const loadOrders = async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const res = await orderApi.getOrders({
        limit: 50,
        status: nextStatus || undefined,
      });
      setOrders(res.data.data.orders);
    } catch (err: any) {
      setError(err.response?.data?.message || '订单加载失败');
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
  const refundRequestStatuses: OrderStatus[] = ['PAID', 'SHIPPED', 'CONFIRMED'];

  return (
    <div className="page orders-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Buyer Orders</p>
          <h1>我的订单</h1>
          <p className="section-copy">查看中标后生成的订单，并完成支付、收货和售后操作。</p>
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
      {loading ? <div className="loading">订单加载中...</div> : null}

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
                  <span>卖家：{order.seller?.username || '未知'}</span>
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
                <Link to={`/orders/${order.id}?from=orders`} className="btn btn-secondary">
                  详情
                </Link>
                {order.status === 'PENDING_PAYMENT' && (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={actingId === order.id}
                      onClick={() =>
                        runAction(order.id, async () => {
                          await orderApi.payOrder(order.id);
                          await fetchProfile();
                        })
                      }
                    >
                      支付
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={actingId === order.id}
                      onClick={() => runAction(order.id, () => orderApi.cancelOrder(order.id, '买家取消订单'))}
                    >
                      取消
                    </button>
                  </>
                )}
                {order.status === 'SHIPPED' && (
                  <button
                    className="btn btn-primary"
                    disabled={actingId === order.id}
                    onClick={() => runAction(order.id, () => orderApi.confirmOrder(order.id))}
                  >
                    确认收货
                  </button>
                )}
                {refundRequestStatuses.includes(order.status) && !order.refundReason && (
                  <button
                    className="btn btn-secondary"
                    disabled={actingId === order.id}
                    onClick={() => {
                      const reason = window.prompt('请输入退款原因', '商品与描述不符');
                      if (reason) {
                        void runAction(order.id, () => orderApi.requestRefund(order.id, reason));
                      }
                    }}
                  >
                    申请退款
                  </button>
                )}
              </div>
            </article>
          ))}
          {!orders.length && <div className="empty-state">暂无订单。</div>}
        </div>
      )}
    </div>
  );
}
