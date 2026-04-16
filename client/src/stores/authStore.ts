import { create } from 'zustand';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  email: localStorage.getItem('email'),
  isAuthenticated: !!localStorage.getItem('email'),
  login: (email) => {
    localStorage.setItem('email', email);
    set({ email, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('email');
    set({ email: null, isAuthenticated: false });
  },
}));
