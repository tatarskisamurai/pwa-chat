import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@/types/user';
import { storage } from '@/services/storage';
import { api } from '@/services/api';
import { disconnectSocket } from '@/services/socket';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Обновить данные пользователя (например после смены аватарки). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const t = storage.getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.get<User>('/api/users/me');
      setUser(u);
      setToken(t);
    } catch {
      storage.clear();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/api/auth/login', { username, password });
    storage.setToken(res.access_token);
    storage.setUser(JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/api/auth/register', { username, password });
    storage.setToken(res.access_token);
    storage.setUser(JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    disconnectSocket();
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);
  const value: AuthContextValue = { user, token, loading, login, register, logout, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
