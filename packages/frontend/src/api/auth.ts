import client from './client';
import type { Role, User } from '@liveauctioner/shared';

export interface AuthResponse {
  data: {
    user: User;
    token: string;
  };
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  role: Role;
}

export interface BalanceResponse {
  data: {
    balance: number;
    frozenBalance: number;
  };
}

export interface RechargeResponse {
  data: {
    balance: number;
  };
}

export interface CreditLevel {
  creditScore: number;
  depositRate: number;
  isRestricted: boolean;
  isSeverelyRestricted: boolean;
  isBanned: boolean;
}

export interface CreditLog {
  id: string;
  change: number;
  reason: string;
  relatedOrderId?: string;
  createdAt: string;
}

export interface CreditLogsResponse {
  logs: CreditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const authApi = {
  login: (dto: LoginDto) => client.post<AuthResponse>('/auth/login', dto),

  register: (dto: RegisterDto) => client.post<AuthResponse>('/auth/register', dto),

  getProfile: () => client.get<{ data: User }>('/users/me'),

  getBalance: () => client.get<BalanceResponse>('/users/me/balance'),

  recharge: (amount: number) => client.post<RechargeResponse>('/users/me/recharge', { amount }),

  getCreditLevel: () => client.get<{ data: CreditLevel }>('/users/me/credit-level'),

  getCreditLogs: (page = 1, limit = 20) =>
    client.get<{ data: CreditLogsResponse }>(`/users/me/credit-logs?page=${page}&limit=${limit}`),
};
