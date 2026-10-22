import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  state?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(email, password);
          localStorage.setItem('auth_token', response.token);
          set({ 
            user: response.user, 
            token: response.token, 
            isLoading: false 
          });
          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Erro ao fazer login';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          set({ user: null, token: null });
          return false;
        }

        try {
          const user = await api.getProfile();
          set({ user, token });
          return true;
        } catch {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
