import type { Auction, AuctionStatus, Product } from '@liveauctioner/shared';
import client from './client';

export interface AuctionListQuery {
  page?: number;
  limit?: number;
  status?: AuctionStatus;
  category?: string;
  keyword?: string;
}

export interface CreateAuctionDto {
  productId: string;
  startPrice: number;
  reservePrice?: number;
  minIncrement: number;
  startTime?: string;
  endTime?: string;
}

export type UpdateAuctionDto = Partial<CreateAuctionDto>;

export interface AuctionListItem extends Auction {
  product: Product;
  seller?: {
    id: string;
    username: string;
  };
  currentBidder?: {
    id: string;
    username: string;
  } | null;
  _count?: {
    bids: number;
  };
}

export interface BidRecord {
  id: string;
  auctionId: string;
  bidderId: string;
  price: number;
  bidTime: string;
  isValid: boolean;
  bidder?: {
    id: string;
    username: string;
  };
  rank?: number;
}

export interface AuctionDetailResponse {
  data: AuctionListItem;
}

export interface AuctionListResponse {
  data: {
    auctions: AuctionListItem[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

const buildQuery = (query: AuctionListQuery) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
};

export const auctionApi = {
  getAuctions: (query: AuctionListQuery = {}) =>
    client.get<AuctionListResponse>(`/auctions${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getUpcomingAuctions: () => client.get<{ data: AuctionListItem[] }>('/auctions/upcoming'),

  getHotAuctions: () => client.get<{ data: AuctionListItem[] }>('/auctions/hot'),

  getAuctionById: (id: string) => client.get<AuctionDetailResponse>(`/auctions/${id}`),

  getAuctionBids: (id: string) => client.get<{ data: BidRecord[] }>(`/auctions/${id}/bids`),

  getAuctionRanking: (id: string) => client.get<{ data: BidRecord[] }>(`/auctions/${id}/ranking`),

  getSellerAuctions: (query: AuctionListQuery = {}) =>
    client.get<AuctionListResponse>(`/auctions/my${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getSellerAuctionById: (id: string) => client.get<AuctionDetailResponse>(`/auctions/my/${id}`),

  createAuction: (dto: CreateAuctionDto) => client.post<AuctionDetailResponse>('/auctions', dto),

  updateAuction: (id: string, dto: UpdateAuctionDto) =>
    client.patch<AuctionDetailResponse>(`/auctions/${id}`, dto),

  startAuction: (id: string) => client.patch<AuctionDetailResponse>(`/auctions/${id}/start`),

  endAuction: (id: string) =>
    client.post<{ data: { auction: AuctionListItem; order: unknown | null } }>(`/auctions/${id}/end`),
};
