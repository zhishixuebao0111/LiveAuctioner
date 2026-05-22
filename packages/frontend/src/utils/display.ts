import type { AuctionStatus, DepositStatus, OrderStatus, ProductStatus, Role } from '@liveauctioner/shared';

export const AUCTION_STATUS_TEXT: Record<AuctionStatus, string> = {
  PENDING: '待开始',
  ONGOING: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消',
};

export const PRODUCT_STATUS_TEXT: Record<ProductStatus, string> = {
  DRAFT: '草稿',
  REVIEWING: '审核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  OFFLINE: '已下架',
};

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '已支付',
  SHIPPED: '已发货',
  CONFIRMED: '已收货',
  AUTO_CONFIRMED: '自动收货',
  CANCELLED: '已取消',
  REFUND_PENDING: '退款中',
  DISPUTED: '争议中',
  REFUNDED: '已退款',
};

export const ROLE_TEXT: Record<Role, string> = {
  BUYER: '买家',
  SELLER: '卖家',
  ADMIN: '管理员',
};

export const DEPOSIT_STATUS_TEXT: Record<DepositStatus, string> = {
  FROZEN: '冻结中',
  REFUNDED: '已退还',
  DEDUCTED: '已扣除',
};

export interface CreditLevelInfo {
  label: string;
  depositRate: string;
  description: string;
  color: 'danger' | 'warning' | 'muted' | 'success';
}

export const getCreditLevelInfo = (creditScore: number): CreditLevelInfo => {
  if (creditScore < 20) {
    return { label: '封禁', depositRate: '-', description: '信用分过低，已被封禁，无法参与竞拍', color: 'danger' };
  }
  if (creditScore < 40) {
    return { label: '严重受限', depositRate: '30%', description: '信用分过低，当前只能浏览不能参与竞拍', color: 'danger' };
  }
  if (creditScore < 60) {
    return { label: '受限', depositRate: '30%', description: '信用分较低，每周最多参与3场拍卖', color: 'warning' };
  }
  if (creditScore < 80) {
    return { label: '警告', depositRate: '20%', description: '信用分一般，保证金比例较高', color: 'warning' };
  }
  return { label: '正常', depositRate: '10%', description: '信用分良好，无限制', color: 'success' };
};

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatDateTime = (value?: string | null) => {
  if (!value) return '未设置';
  return dateTimeFormatter.format(new Date(value));
};

export const formatDate = (value?: string | null) => {
  if (!value) return '未设置';
  return dateFormatter.format(new Date(value));
};

export const formatCountdown = (endTime?: string | null) => {
  if (!endTime) return '未设置结束时间';

  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return '竞拍已结束';

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getInitial = (value?: string | null) => {
  if (!value) return '?';
  return value.slice(0, 1).toUpperCase();
};
