import client from './client';
import type { DepositStatus } from '@liveauctioner/shared';

export interface DepositRecord {
  id: string;
  userId: string;
  auctionId: string;
  amount: number;
  status: DepositStatus;
  createdAt: string;
  updatedAt: string;
  auction: {
    id: string;
    currentPrice: number;
    status: string;
    product: {
      name: string;
      images: string[];
      category: string;
    };
  };
}

export const depositApi = {
  getMyDeposits: () => client.get<{ data: DepositRecord[] }>('/deposits/my'),
};
