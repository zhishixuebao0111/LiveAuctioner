import type { Auction, Order, OrderStatus, Product } from '@liveauctioner/shared';
import client from './client';

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  keyword?: string;
}

export interface OrderListItem extends Omit<Order, 'paymentTime' | 'shippedAt'> {
  auction: Auction & {
    product: Product;
  };
  buyer?: {
    id: string;
    username: string;
  };
  seller?: {
    id: string;
    username: string;
  };
  refundReason?: string | null;
  disputeReason?: string | null;
  paymentTime?: string | null;
  shippedAt?: string | null;
  autoConfirmAt?: string | null;
}

export interface OrderListResponse {
  data: {
    orders: OrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface OrderDetailResponse {
  data: OrderListItem;
}

const buildQuery = (query: OrderListQuery) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
};

const actionPayload = (reason?: string) => ({
  reason: reason?.trim() || undefined,
});

export const orderApi = {
  getOrders: (query: OrderListQuery = {}) =>
    client.get<OrderListResponse>(`/orders${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getSellerOrders: (query: OrderListQuery = {}) =>
    client.get<OrderListResponse>(`/orders/seller${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getAdminOrders: (query: OrderListQuery = {}) =>
    client.get<OrderListResponse>(`/admin/orders${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getOrderById: (id: string) => client.get<OrderDetailResponse>(`/orders/${id}`),

  payOrder: (id: string) => client.post<OrderDetailResponse>(`/orders/${id}/pay`),

  shipOrder: (id: string) => client.post<OrderDetailResponse>(`/orders/${id}/ship`),

  confirmOrder: (id: string) => client.post<OrderDetailResponse>(`/orders/${id}/confirm`),

  cancelOrder: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/orders/${id}/cancel`, actionPayload(reason)),

  requestRefund: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/orders/${id}/refund`, actionPayload(reason)),

  sellerApproveRefund: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/orders/${id}/refund/approve`, actionPayload(reason)),

  sellerRejectRefund: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/orders/${id}/refund/reject`, actionPayload(reason)),

  disputeOrder: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/orders/${id}/dispute`, actionPayload(reason)),

  approveRefund: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/admin/orders/${id}/refund/approve`, actionPayload(reason)),

  rejectRefund: (id: string, reason?: string) =>
    client.post<OrderDetailResponse>(`/admin/orders/${id}/refund/reject`, actionPayload(reason)),
};
