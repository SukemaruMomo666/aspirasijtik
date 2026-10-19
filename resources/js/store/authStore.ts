import { create } from 'zustand';
import { Admin } from '../types';

interface AuthStore {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setAdmin: (admin: Admin | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  admin: localStorage.getItem('admin')
    ? JSON.parse(localStorage.getItem('admin') || 'null')
    : null,
  token: localStorage.getItem('admin_token'),
  isLoading: false,
  error: null,

  setAdmin: (admin) => {
    if (admin) {
      localStorage.setItem('admin', JSON.stringify(admin));
    } else {
      localStorage.removeItem('admin');
    }
    set({ admin });
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
    set({ token });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  logout: () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('admin_token');
    set({ admin: null, token: null });
  },
}));
