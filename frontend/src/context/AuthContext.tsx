import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
import type { RegisterStudentPayload, UpdateProfilePayload, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterStudentPayload) => Promise<User>;
  updateProfile: (data: UpdateProfilePayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserState: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const { user: me } = await api.me();
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // แท็บอื่นล็อกอิน/ออกจากระบบ — ซิงก์โทเคนกับสถานะผู้ใช้ (กันเข้าห้องด้วยโทเคนคนละบทบาท)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'auth_token') return;
      void loadUser();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { user: loggedIn, token } = await api.login(email, password);
    await setToken(token);
    setUser(loggedIn);
    return loggedIn;
  };

  const register = async (data: RegisterStudentPayload) => {
    const { user: registered, token } = await api.register(data);
    if (token) {
      await setToken(token);
      setUser(registered);
    }
    return registered;
  };

  const updateProfile = async (data: UpdateProfilePayload) => {
    const { user: updated } = await api.updateProfile(data);
    setUser(updated);
    return updated;
  };

  const refreshUser = async () => {
    const { user: me } = await api.me();
    setUser(me);
  };

  const setUserState = (next: User) => {
    setUser(next);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateProfile, logout, refreshUser, setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
