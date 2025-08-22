import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setCurrentUser } from "../session";
import type { User } from '../services/auth';
import { login as apiLogin, register as apiRegister, logout as apiLogout, me, refresh } from '../services/auth';
import { setAccessTokenGetter, setAccessTokenHandler } from '../lib/api';

type AuthContextShape = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;

  // Back-compat shim so older code paths won’t crash
  loginWithTokens: (payload: { user: User; accessToken: string }) => void;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // keep the latest token in a ref so the API getter is always fresh
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  // Wire the API wrapper (if you use it) so requests always read the latest token
  useEffect(() => {
    try {
      setAccessTokenGetter?.(() => tokenRef.current ?? null);
      // Let the API wrapper push new tokens back to us after a refresh
      setAccessTokenHandler?.((nextToken: string | null | undefined) => {
        setAccessToken(nextToken ?? null);
      });
    } catch {
      // If your wrapper doesn't export these, ignore silently
    }
  }, []);

  const initSession = useCallback(async () => {
    setLoading(true);
    try {
      // 1) ask who I am (httpOnly session via cookie)
      const meRes = await me(); // { user: User | null }
      setUser(meRes.user ?? null);
      setCurrentUser(meRes.user ?? null);

      // 2) try to obtain an access token (if your backend issues one)
      const r = await refresh(); // { accessToken?: string }
      if (r?.accessToken) setAccessToken(r.accessToken ?? null);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void initSession();
  }, [initSession]);

  const login = useCallback(async (email: string, password: string) => {
    // auth.ts contract: { user, accessToken }
    const { user: u, accessToken: at } = await apiLogin({ email, password });
    setUser(u);
    setCurrentUser(u);
    setAccessToken(at ?? null);
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    // auth.ts contract: { user, accessToken }
    const { user: u, accessToken: at } = await apiRegister(payload as any);
    setUser(u);
    setCurrentUser(u);
    setAccessToken(at ?? null);
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setCurrentUser(null);
      setAccessToken(null);
    }
  }, []);

  const doRefresh = useCallback(async () => {
    const r = await refresh();
    if (r?.accessToken) setAccessToken(r.accessToken ?? null);
  }, []);

  // Back-compat for old callers that were doing manual token injection
  const loginWithTokens = useCallback((payload: { user: User; accessToken: string }) => {
    setUser(payload.user);
    setAccessToken(payload.accessToken ?? null);
  }, []);

  useEffect(() => { setCurrentUser(user); }, [user]);

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      logout: doLogout,
      refresh: doRefresh,
      loginWithTokens,
    }),
    [user, accessToken, loading, login, register, doLogout, doRefresh, loginWithTokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
