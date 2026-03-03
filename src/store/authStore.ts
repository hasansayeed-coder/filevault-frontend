import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth:    (user: User, accessToken: string, refreshToken: string) => void;
  setUser:    (user: User) => void;
  logout:     () => void;
  rehydrate:  () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,

  rehydrate: () => {
    if (typeof window === 'undefined') return;
    const token        = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr      = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, accessToken: token, refreshToken, isAuthenticated: true });
      } catch {}
    }
  },

  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user',         JSON.stringify(user));
    }
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  // Update user in store + localStorage without touching tokens
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));