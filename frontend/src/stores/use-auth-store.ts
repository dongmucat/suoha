import { create } from 'zustand';
import api from '@/lib/axios';

interface User {
  userId: string;
  phone: string;
  nickname: string;
  currentRoomId: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phone: string, password: string) => {
    try {
      const res: any = await api.post('/auth/login', { phone, password });
      const { token, userId, phone: userPhone, nickname } = res.data;
      localStorage.setItem('token', token);
      set({
        token,
        user: { userId, phone: userPhone, nickname, currentRoomId: null },
        isAuthenticated: true,
      });
    } catch (err: any) {
      throw new Error(err.message || '登录失败');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const res: any = await api.get('/auth/me');
      set({
        token,
        user: res.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
