import React from "react";

type Tokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;   // epoch ms
  refreshTokenExpiresAt: number;  // epoch ms
};

type AuthContextValue = {
  isHydrated: boolean;            // we've loaded from storage at least once
  isAuthenticated: boolean;
  tokens: Tokens | null;
  loginWithTokens: (t: Tokens) => void;    // set tokens received from backend
  logout: () => void;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const LS_KEY = "fh:auth:v1";

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Tokens;
    if (!t?.accessToken || !t?.refreshToken) return null;
    return t;
  } catch { return null; }
}
function saveTokens(t: Tokens | null) {
  try {
    if (!t) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify(t));
  } catch {}
}

// ⬇️ Backend “adapters” — left EMPTY on purpose (your team will wire these).
type RefreshResult = {
  accessToken: string;
  accessTokenExpiresAt: number;     // epoch ms
  refreshToken?: string;            // optional new refresh token
  refreshTokenExpiresAt?: number;   // epoch ms
};
type AuthAdapters = {
  /** Replace with a call to your Spring Boot refresh endpoint */
  refresh?: (refreshToken: string) => Promise<RefreshResult>;
};
const defaultAdapters: AuthAdapters = {
  refresh: async (_rt) => {
    // TODO: call your backend: POST /auth/refresh
    // For now, throw so you can see it’s not wired.
    throw new Error("Refresh token flow not wired yet.");
  },
};

export function AuthProvider({
  children,
  adapters = defaultAdapters,
}: {
  children: React.ReactNode;
  adapters?: AuthAdapters;
}) {
  const [isHydrated, setHydrated] = React.useState(false);
  const [tokens, setTokens] = React.useState<Tokens | null>(null);
  const refreshTimer = React.useRef<number | null>(null);

  // hydrate once
  React.useEffect(() => {
    const t = loadTokens();
    setTokens(t);
    setHydrated(true);
  }, []);

  // schedule refresh before access expiry (5s early)
  const scheduleRefresh = React.useCallback((t: Tokens | null) => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!t) return;

    const now = Date.now();
    const msUntil = Math.max(0, t.accessTokenExpiresAt - now - 5000);
    if (msUntil === 0) return; // will be attempted lazily on first request

    refreshTimer.current = window.setTimeout(async () => {
      try {
        await doRefresh();
      } catch {
        // if refresh fails, keep tokens but next apiFetch will logout on 401
      }
    }, msUntil);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters]);

  React.useEffect(() => {
    scheduleRefresh(tokens);
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [tokens, scheduleRefresh]);

  const loginWithTokens = React.useCallback((t: Tokens) => {
    setTokens(t);
    saveTokens(t);
  }, []);

  const logout = React.useCallback(() => {
    setTokens(null);
    saveTokens(null);
  }, []);

  async function doRefresh(): Promise<void> {
    if (!tokens) throw new Error("No tokens");
    if (!adapters.refresh) throw new Error("No refresh adapter");

    // if refresh token already expired, logout
    if (Date.now() >= tokens.refreshTokenExpiresAt) {
      logout();
      throw new Error("Refresh token expired");
    }

    const res = await adapters.refresh(tokens.refreshToken);
    const next: Tokens = {
      accessToken: res.accessToken,
      accessTokenExpiresAt: res.accessTokenExpiresAt,
      refreshToken: res.refreshToken ?? tokens.refreshToken,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt ?? tokens.refreshTokenExpiresAt,
    };
    setTokens(next);
    saveTokens(next);
  }

  // Safe fetch wrapper: adds Authorization, retries once after refresh on 401
  const apiFetch = React.useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const doFetch = async (withAuth = true) => {
      const headers = new Headers(init?.headers || {});
      if (withAuth && tokens?.accessToken) {
        headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      }
      const resp = await fetch(input, { ...init, headers });
      return resp;
    };

    let resp = await doFetch(true);

    if (resp.status === 401 && tokens?.refreshToken) {
      // try refresh once
      try {
        await doRefresh();
      } catch {
        logout();
        return resp;
      }
      resp = await doFetch(true);
      if (resp.status === 401) {
        logout();
      }
    }

    return resp;
  }, [tokens, logout]); // doRefresh binds tokens/adapters from closure

  const value: AuthContextValue = {
    isHydrated,
    isAuthenticated: !!tokens && Date.now() < tokens.refreshTokenExpiresAt,
    tokens,
    loginWithTokens,
    logout,
    apiFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
