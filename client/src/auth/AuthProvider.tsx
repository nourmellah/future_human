import React from "react";
import type { ReactNode } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  me as apiMe,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
  type User,
} from "../services/auth";
import {
  setAccessTokenGetter,
  setAccessTokenHandler,
} from "../lib/api";

/* ------------------------------------------------------------------ */
/* Storage keys                                                        */
/* ------------------------------------------------------------------ */

const ACCESS_TOKEN_KEY = "fh.accessToken";

/* ------------------------------------------------------------------ */
/* Context types                                                       */
/* ------------------------------------------------------------------ */

type AuthContextShape = {
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;

  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;

  /** Refetch user from /auth/me (e.g., after profile edits) */
  refreshUser: () => Promise<User | null>;

  /** Manually set current user (client-side updates) */
  setUser: (u: User | null) => void;
};

const AuthContext = React.createContext<AuthContextShape | undefined>(undefined);

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [accessToken, _setAccessToken] = React.useState<string | null>(null);

  // Keep api.ts aware of the current token (reads latest value via getter)
  React.useEffect(() => {
    setAccessTokenGetter(() => accessToken);
    // Optional: expose a handler if some external flow needs to inject a token.
    setAccessTokenHandler((tok) => {
      setToken(tok);
    });
  }, [accessToken]);

  // Boot: load token from localStorage, then fetch /auth/me
  React.useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored && typeof stored === "string") {
      _setAccessToken(stored);
      // We'll immediately validate and pull the user
      void (async () => {
        try {
          const { user } = await apiMe();
          setUser(user ?? null);
        } catch {
          // Token invalid/expired
          clearToken();
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistToken(tok: string | null) {
    if (tok) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tok);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  function setToken(tok: string | null) {
    persistToken(tok);
    _setAccessToken(tok);
  }

  function clearToken() {
    persistToken(null);
    _setAccessToken(null);
  }

  async function handleAuthResponse(res: AuthResponse): Promise<User> {
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }

  async function login(payload: LoginPayload): Promise<User> {
    try {
      const res = await apiLogin(payload);
      return await handleAuthResponse(res);
    } catch (e: any) {
      // Defensive: clear any bad token and user on failure
      clearToken();
      setUser(null);
      throw e;
    }
  }

  async function register(payload: RegisterPayload): Promise<User> {
    try {
      const res = await apiRegister(payload);
      return await handleAuthResponse(res);
    } catch (e: any) {
      clearToken();
      setUser(null);
      throw e;
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout();
    } catch {
      // ignore network/server errors on logout (stateless)
    } finally {
      clearToken();
      setUser(null);
    }
  }

  async function refreshUser(): Promise<User | null> {
    try {
      const { user } = await apiMe();
      setUser(user ?? null);
      return user ?? null;
    } catch (e: any) {
      // 401/expired → sign out locally
      clearToken();
      setUser(null);
      return null;
    }
  }

  const value: AuthContextShape = {
    isLoading,
    user,
    accessToken,

    login,
    register,
    logout,

    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextShape {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
