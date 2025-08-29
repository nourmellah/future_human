import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";

/* ----------------------------- Types (server-aligned) ----------------------------- */

export type AgentIdentity = {
  name: string;
  role: string;
  companyName?: string | null;
  desc?: string | null;
};

export type AgentAppearance = {
  personaId?: string | null;
  bgColor?: string | null;
};

export type AgentVoice = {
  language: string;
  name: string;
  style?: string | null;
};

export type AgentStyle = {
  formality: number;   // int 0..10
  pace: number;        // int 0..10
  calm: number;        // int 0..10
  introvert: number;   // int 0..10
  empathy: number;     // int 0..10
  humor: number;       // int 0..10
  creativity: number;  // int 0..10
  directness: number;  // int 0..10
};

export type AgentBrain = {
  id: string; // required on create
  instructions?: string | null;
};

export type AgentCards = {
  backgroundId?: string | null;
};

export type Agent = {
  id: number;
  ownerId: number;
  identity: AgentIdentity;
  appearance: AgentAppearance;
  voice: { language: string; name: string };
  style: AgentStyle;
  brain: { id: string; instructions?: string | null };
  cards: AgentCards;
  draftId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentCreate = {
  identity: AgentIdentity;
  appearance?: AgentAppearance;
  voice: AgentVoice;
  style: AgentStyle;
  brain: AgentBrain;
  cards?: AgentCards;
  draftId?: string | null;
};

export type AgentUpdate = {
  identity?: Partial<AgentIdentity>;
  appearance?: Partial<AgentAppearance>;
  voice?: Partial<AgentVoice>;
  style?: Partial<AgentStyle>;
  brain?: Partial<AgentBrain>;
  cards?: Partial<AgentCards>;
  draftId?: string | null;
};

/* --------------------------- Connections sub-API types --------------------------- */

export type ConnectionStatus = "connected" | "needs_setup" | "error";

export type ConnectionItem = {
  id?: number | string;
  agentId?: number | string;
  providerId: string;
  extId: string;
  status?: ConnectionStatus;
  config?: any | null;
  token?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ConnectionUpdate = Partial<ConnectionItem>;

/* --------------------------------- Utilities --------------------------------- */

// Remove only undefined (keep nulls so server can null fields intentionally)
function clean<T>(obj: T): T {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(clean) as any;
  const out: any = {};
  for (const [k, v] of Object.entries(obj as any)) {
    if (v === undefined) continue;
    out[k] = typeof v === "object" && v !== null ? clean(v) : v;
  }
  return out;
}

/* -------------------------------- Endpoints -------------------------------- */

const base = "/agents";

/** List current user's agents */
export async function listAgents(): Promise<{ agents: Agent[] }> {
  return apiGet(`${base}`);
}

/** Read one agent by id */
export async function getAgent(id: number | string): Promise<{ agent: Agent }> {
  return apiGet(`${base}/${id}`);
}

/** Create an agent (server-shaped payload only) */
export async function createAgent(payload: AgentCreate): Promise<{ agent: Agent }> {
  return apiPost(`${base}`, clean(payload));
}

/** Partial update (send only the top-level objects you intend to change) */
export async function patchAgent(
  id: number | string,
  patch: AgentUpdate
): Promise<{ agent: Agent }> {
  return apiPatch(`${base}/${id}`, clean(patch));
}

/** Delete one agent */
export async function deleteAgent(id: number | string): Promise<{ ok: true }> {
  return apiDelete(`${base}/${id}`);
}

/* -------------------------- Connections sub-API -------------------------- */

export async function listConnections(agentId: number | string): Promise<ConnectionItem[]> {
  const res = (await apiGet(`/agents/${agentId}/connections`)) as any;
  return (res?.connections ?? []) as ConnectionItem[];
}

export async function createConnection(
  agentId: number | string,
  payload: Omit<ConnectionItem, "id" | "agentId" | "createdAt" | "updatedAt">
): Promise<ConnectionItem> {
  const res = (await apiPost(`/agents/${agentId}/connections`, payload)) as any;
  return res.connection as ConnectionItem;
}

export async function updateConnection(
  agentId: number | string,
  connId: number | string,
  patch: Partial<Omit<ConnectionItem, "id" | "agentId" | "createdAt" | "updatedAt">>
): Promise<ConnectionItem> {
  const res = (await apiPatch(`/agents/${agentId}/connections/${connId}`, patch)) as any;
  return res.connection as ConnectionItem;
}

export async function deleteConnection(agentId: number | string, connId: number | string): Promise<void> {
  await apiDelete(`/agents/${agentId}/connections/${connId}`);
}

// ---------- Bulk diff helper (create/update/delete in one submit) ----------

function sameVal(a: any, b: any) {
  if (typeof a === "object" && typeof b === "object") {
    try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); } catch { return a === b; }
  }
  return a === b;
}

function equalConn(a: ConnectionItem, b: ConnectionItem) {
  return (
    a.providerId === b.providerId &&
    a.extId === b.extId &&
    (a.status ?? "needs_setup") === (b.status ?? "needs_setup") &&
    sameVal(a.config ?? null, b.config ?? null) &&
    (a.token ?? null) === (b.token ?? null)
  );
}

/**
 * Compute delta between `before` (loaded from server) and `after` (edited in form),
 * then perform API calls for created/updated/deleted connections.
 */
export async function saveConnectionsDelta(
  agentId: number | string,
  before: ConnectionItem[],
  after: ConnectionItem[]
): Promise<{ created: ConnectionItem[]; updated: ConnectionItem[]; deleted: (number | string)[] }> {
  const key = (c: ConnectionItem) => (c.id != null ? `id:${c.id}` : `k:${c.providerId}#${c.extId}`);

  const pre = new Map(before.map((c) => [key(c), c]));
  const cur = new Map(after.map((c) => [key(c), c]));

  const created: ConnectionItem[] = [];
  const updated: ConnectionItem[] = [];
  const deleted: (number | string)[] = [];

  // Create + Update
  for (const [k, c] of cur) {
    const prev = pre.get(k);
    if (!prev) {
      const made = await createConnection(agentId, {
        providerId: c.providerId,
        extId: c.extId,
        status: c.status ?? "needs_setup",
        config: c.config ?? null,
        token: c.token ?? null,
      });
      created.push(made);
      continue;
    }

    if (!equalConn(prev, c) && prev.id != null) {
      const up = await updateConnection(agentId, prev.id, {
        providerId: c.providerId,
        extId: c.extId,
        status: c.status,
        config: c.config,
        token: c.token,
      });
      updated.push(up);
    }
  }

  // Delete
  for (const [k, c] of pre) {
    if (!cur.has(k) && c.id != null) {
      await deleteConnection(agentId, c.id);
      deleted.push(c.id);
    }
  }

  return { created, updated, deleted };
}
