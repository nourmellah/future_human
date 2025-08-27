import * as React from "react";
import { listAgents } from "./services/agents";

export type Agent = {
  id: number | string;
  identity?: { name?: string; role?: string; desc?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null };
  updatedAt?: string;
  thumbnail?: string;
};

type AgentsContextValue = {
  agents: Agent[];
  loading: boolean;
  error: unknown | null;
  refresh: () => void;
  /** Force a refetch on next render (use if you know data changed on server) */
  invalidate: () => void;
};

const AgentsContext = React.createContext<AgentsContextValue | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown | null>(null);
  const [staleToken, setStaleToken] = React.useState(0);

  const fetchFromServer = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const res = await listAgents({ signal: ac.signal } as any);
      // listAgents() may return { agents } or [] depending on your API — support both
      const data = (res as any)?.agents ?? res ?? [];
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    return () => ac.abort();
  }, []);

  React.useEffect(() => {
    let disposed = false;
    (async () => {
      if (disposed) return;
      await fetchFromServer();
    })();
    return () => {
      disposed = true;
    };
    // staleToken lets us "invalidate" externally
  }, [fetchFromServer, staleToken]);

  // Optional: refetch when window regains focus
  React.useEffect(() => {
    const onFocus = () => fetchFromServer();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchFromServer]);

  const refresh = React.useCallback(() => {
    setStaleToken((n) => n + 1);
  }, []);
  const invalidate = refresh;

  const value = React.useMemo<AgentsContextValue>(
    () => ({ agents, loading, error, refresh, invalidate }),
    [agents, loading, error, refresh, invalidate]
  );

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

export function useAgents() {
  const ctx = React.useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be used within <AgentsProvider>");
  return ctx;
}
