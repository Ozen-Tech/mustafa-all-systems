import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { User } from '../types';
import { authService } from '../services/authService';
import {
  clearAuthSession,
  getRefreshToken,
  getStoredUserJson,
  setAuthSession,
} from '../services/tokenStorage';
import {
  refreshAccessToken,
  restoreSessionOnStartup,
  setSessionExpiredHandler,
} from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
  }, []);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    async function loadUser() {
      try {
        const userJson = await getStoredUserJson();
        if (!userJson) {
          return;
        }

        const sessionOk = await restoreSessionOnStartup();
        const latestUserJson = (await getStoredUserJson()) || userJson;

        if (sessionOk) {
          setUser(JSON.parse(latestUserJson));
          return;
        }

        await logoutRef.current();
      } catch (error) {
        console.error('Error loading user:', error);
        await logoutRef.current();
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void logoutRef.current();
    });

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void (async () => {
          const refreshToken = await getRefreshToken();
          if (refreshToken) {
            await refreshAccessToken();
          }
        })();
      }
    });

    return () => {
      setSessionExpiredHandler(null);
      subscription.remove();
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await authService.login(email, password);
    await setAuthSession(
      response.accessToken,
      response.refreshToken,
      JSON.stringify(response.user)
    );
    setUser(response.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
