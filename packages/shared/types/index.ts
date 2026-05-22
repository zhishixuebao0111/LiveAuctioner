// 角色
export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

// 用户状态
export type UserStatus = 'ACTIVE' | 'BANNED' | 'SUSPENDED';

// 商品状态
export type ProductStatus = 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'OFFLINE';

// 拍卖状态
export type AuctionStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'CANCELLED';

// 拍卖结果
export type AuctionResult = 'SOLD' | 'UNSOLD' | 'CANCELLED';

// 订单状态
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'CONFIRMED'
  | 'AUTO_CONFIRMED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'DISPUTED'
  | 'REFUNDED';

// 保证金状态
export type DepositStatus = 'FROZEN' | 'REFUNDED' | 'DEDUCTED';

// 用户
export interface User {
  id: string;
  username: string;
  role: Role;
  balance: number;
  frozenBalance: number;
  creditScore: number;
  violationCount: number;
  status: UserStatus;
  createdAt: string;
}

// 商品
export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description?: string;
  images: string[];
  category: string;
  status: ProductStatus;
  createdAt: string;
}

// 拍卖
export interface Auction {
  id: string;
  productId: string;
  sellerId: string;
  startPrice: number;
  reservePrice?: number;
  minIncrement: number;
  startTime?: string;
  endTime?: string;
  status: AuctionStatus;
  result?: AuctionResult;
  currentPrice: number;
  currentBidderId?: string;
  bidCount: number;
  createdAt: string;
}

// 出价
export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  price: number;
  bidTime: string;
  isValid: boolean;
}

// 订单
export interface Order {
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  finalPrice: number;
  status: OrderStatus;
  paymentTime?: string;
  shippedAt?: string;
  createdAt: string;
}

// WebSocket 事件
export interface ServerToClientEvents {
  auction_update: (auction: Auction) => void;
  bid_placed: (bid: Bid) => void;
  auction_ended: (auctionId: string, result: AuctionResult) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  join_auction: (auctionId: string) => void;
  leave_auction: (auctionId: string) => void;
  place_bid: (auctionId: string, price: number) => void;
}
