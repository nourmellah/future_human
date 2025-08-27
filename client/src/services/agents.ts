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
  // optional passthrough (server may ignore if unused)
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

export type AgentConnection = {
  id: number;
  agentId: number;
  extId: string;
  providerId: string;
  status: "connected" | "needs_setup" | "error";
  config?: any | null;
  token?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionCreate = {
  extId: string;
  providerId: string;
  status?: "connected" | "needs_setup" | "error";
  config?: any;
  token?: string | null;
};

export type ConnectionUpdate = Partial<ConnectionCreate>;

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

export async function listConnections(
  agentId: number | string
): Promise<{ connections: AgentConnection[] }> {
  return apiGet(`${base}/${agentId}/connections`);
}

// Convenience upsert: PATCH if extId exists, otherwise POST
export async function upsertConnections(
  agentId: number | string,
  items:
    | (ConnectionCreate & { id?: number })
    | Array<ConnectionCreate & { id?: number }>
): Promise<{ connections: AgentConnection[] }> {
  const arr = Array.isArray(items) ? items : [items];
  const { connections: existing } = await listConnections(agentId);

  for (const item of arr) {
    const withId = (item as any).id as number | undefined;
    if (withId) {
      await apiPatch(`${base}/${agentId}/connections/${withId}`, clean(item));
      continue;
    }
    const match = existing.find(c => c.extId === item.extId);
    if (match) {
      await apiPatch(`${base}/${agentId}/connections/${match.id}`, clean(item));
    } else {
      await apiPost(`${base}/${agentId}/connections`, clean(item));
    }
  }

  return listConnections(agentId);
}
