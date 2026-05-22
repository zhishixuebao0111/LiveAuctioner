import { create } from 'zustand';
import { authApi, type LoginDto, type RegisterDto } from '../api/auth';
import type { User } from '@liveauctioner/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  recharge: (amount: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  login: async (dto) => {
    const res = await authApi.login(dto);
    const { user, token } = res.data.data;
    localStorage.setItem('token', token);
    set({ user, token });
  },

  register: async (dto) => {
    const res = await authApi.register(dto);
    const { user, token } = res.data.data;
    localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const res = await authApi.getProfile();
      set({ user: res.data.data, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },

  recharge: async (amount) => {
    const res = await authApi.recharge(amount);
    set((state) => ({
      user: state.user ? { ...state.user, balance: res.data.data.balance } : state.user,
    }));
  },
}));
