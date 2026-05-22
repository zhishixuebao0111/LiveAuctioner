import { useEffect, useState } from 'react';
import type { OrderStatus } from '@liveauctioner/shared';
import { Link } from 'react-router-dom';
import { orderApi, type OrderListItem } from '../api/orders';
import { formatCurrency, formatDateTime, ORDER_STATUS_TEXT } from '../utils/display';

type ArbitrationFilter = OrderStatus | 'PENDING_ARBITRATION' | '';

export default function AdminOrderArbitration() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState<ArbitrationFilter>('PENDING_ARBITRATION');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  const loadOrders = async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      if (nextStatus === 'PENDING_ARBITRATION') {
        const [refundRes, disputeRes] = await Promise.all([
          orderApi.getAdminOrders({ limit: 50, status: 'REFUND_PENDING' }),
          orderApi.getAdminOrders({ limit: 50, status: 'DISPUTED' }),
        ]);
        setOrders([...refundRes.data.data.orders, ...disputeRes.data.data.orders]);
      } else {
        const res = await orderApi.getAdminOrders({
          limit: 50,
          status: nextStatus || undefined,
        });
        setOrders(res.data.data.orders);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '仲裁订单加载失败');
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
      setError(err.response?.data?.message || '仲裁操作失败');
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="page admin-orders-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>订单仲裁</h1>
          <p className="section-copy">处理退款申请和订单争议，完成售后闭环。</p>
        </div>
      </div>

      <div className="filter-bar compact">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as ArbitrationFilter)}
        >
          <option value="PENDING_ARBITRATION">待仲裁</option>
          <option value="">全部状态</option>
          <option value="REFUND_PENDING">退款中</option>
          <option value="DISPUTED">争议中</option>
          <option value="REFUNDED">已退款</option>
        </select>
        <button className="btn btn-primary" onClick={() => loadOrders(status)}>
          筛选
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? <div className="loading">仲裁订单加载中...</div> : null}

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
                  <span>卖家：{order.seller?.username || '未知'}</span>
                  <span>生成于 {formatDateTime(order.createdAt)}</span>
                </div>
                <h3>{order.auction.product.name}</h3>
                <p>成交价：{formatCurrency(order.finalPrice)}</p>
                {order.refundReason ? <p className="inline-tip">退款原因：{order.refundReason}</p> : null}
                {order.disputeReason ? <p className="inline-tip">争议备注：{order.disputeReason}</p> : null}
              </div>
              <div className="seller-card-actions">
                <Link
                  to={`/orders/${order.id}?from=admin-arbitration`}
                  className="btn btn-secondary"
                >
                  详情
                </Link>
                {['REFUND_PENDING', 'DISPUTED'].includes(order.status) && (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={actingId === order.id}
                      onClick={() => {
                        const reason = window.prompt('请输入同意退款说明', '管理员同意退款');
                        if (reason) {
                          void runAction(order.id, () => orderApi.approveRefund(order.id, reason));
                        }
                      }}
                    >
                      同意退款
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={actingId === order.id}
                      onClick={() => {
                        const reason = window.prompt('请输入驳回退款说明', '管理员驳回退款');
                        if (reason) {
                          void runAction(order.id, () => orderApi.rejectRefund(order.id, reason));
                        }
                      }}
                    >
                      驳回
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {!orders.length && <div className="empty-state">暂无符合条件的仲裁订单。</div>}
        </div>
      )}
    </div>
  );
}
