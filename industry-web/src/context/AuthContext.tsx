import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '../services/authService';
import { industryOwnerService, Industry } from '../services/industryOwnerService';

interface AuthState {
  user: AuthUser | null;
  industry: Industry | null;
  industryId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadIndustry() {
    const me = await industryOwnerService.getMe();
    setIndustryId(me.industryId);
    setIndustry(me.industry);
  }

  useEffect(() => {
    const stored = authService.getStoredUser();
    const token = localStorage.getItem('accessToken');
    if (stored && stored.role === 'INDUSTRY_OWNER' && token) {
      setUser(stored);
      loadIndustry()
        .catch(() => {
          authService.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const u = await authService.login(email, password);
    setUser(u);
    await loadIndustry();
  }

  function logout() {
    authService.logout();
    setUser(null);
    setIndustry(null);
    setIndustryId(null);
  }

  return (
    <AuthContext.Provider value={{ user, industry, industryId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
