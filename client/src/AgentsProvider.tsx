// src/AgentsProvider.tsx
import React from "react";
import { listAgents } from "./services/agents";
import { useAuth } from "./auth/AuthProvider";

export type Agent = {
  id: number | string;
  identity?: { name?: string; role?: string; desc?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null };
  updatedAt?: string;
};

type Ctx = {
  agents: Agent[];
  loading: boolean;
  error: unknown | null;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
};

const AgentsContext = React.createContext<Ctx | undefined>(undefined);

export function useAgents(): Ctx {
  const ctx = React.useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be used inside <AgentsProvider>");
  return ctx;
}

const TTL_MS = 60_000; // optional revalidate threshold

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? "anon";

  const storageKey = React.useMemo(() => `agents:${uid}:v1`, [uid]);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown | null>(null);
  const lastLoadedRef = React.useRef<number>(0);
  const invalidatedRef = React.useRef<boolean>(false);

  // Hydrate quickly from localStorage (optional)
  React.useEffect(() => {
    setAgents([]);
    setError(null);
    setLoading(true);
    lastLoadedRef.current = 0;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const cached = JSON.parse(raw) as { at: number; data: Agent[] };
        setAgents(cached.data || []);
        lastLoadedRef.current = cached.at || 0;
      }
    } catch {}
    // Trigger initial fetch
    void fetchNow({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (data: Agent[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), data }));
    } catch {}
  };

  const fetchNow = React.useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!uid) return;
      const stale = Date.now() - lastLoadedRef.current > TTL_MS;
      if (!force && !invalidatedRef.current && !stale && agents.length) return;

      setLoading(true);
      setError(null);
      try {
        const res = await listAgents(); // uses your api.ts wrapper
        const next = res.agents ?? [];
        setAgents(next);
        persist(next);
        lastLoadedRef.current = Date.now();
        invalidatedRef.current = false;
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [uid, agents.length]
  );

  const invalidate = React.useCallback(() => {
    invalidatedRef.current = true;
  }, []);

  const value = React.useMemo(
    () => ({ agents, loading, error, refresh: fetchNow, invalidate }),
    [agents, loading, error, fetchNow, invalidate]
  );

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}
