import * as API from "../lib/api";

/* ------------------- thin adapter over your api.ts ------------------- */
function call(fn: string, path: string, body?: any) {
  const anyAPI = API as any;

  // Prefer explicit helpers if present (apiGet/apiPost/apiPatch/apiDelete)
  if (typeof anyAPI[fn] === "function") {
    return fn === "apiGet" || fn === "apiDelete"
      ? anyAPI[fn](path)
      : anyAPI[fn](path, body);
  }

  // Fallback to a generic request(config) if your wrapper exposes it
  if (typeof anyAPI.request === "function") {
    const method =
      fn === "apiGet"
        ? "GET"
        : fn === "apiPost"
        ? "POST"
        : fn === "apiPatch"
        ? "PATCH"
        : fn === "apiDelete"
        ? "DELETE"
        : "GET";
    return anyAPI.request({ method, url: path, data: body });
  }

  throw new Error("API wrapper is missing expected functions");
}

const GET = (p: string) => call("apiGet", p);
const POST = (p: string, b?: any) => call("apiPost", p, b);
const PATCH = (p: string, b?: any) => call("apiPatch", p, b);
const DELETE_ = (p: string) => call("apiDelete", p);

/* ---------------------- types & normalization ------------------------ */
type AgentServerCreate = {
  identity: { name: string; role: string; desc?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null };
  voice: { language: string; name: string };
  style: {
    formality: number; pace: number; calm: number; introvert: number;
    empathy: number; humor: number; creativity: number; directness: number;
  };
  brain: { id: string; instructions?: string | null };
  cards?: { backgroundId?: string | null };
  draftId?: string | null;
};
type AgentServerUpdate = Partial<AgentServerCreate>;
type Agent = { id: number | string } & AgentServerCreate;

type WizardStateLike = {
  identity?: { name?: string; role?: string; description?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null; backgroundColor?: string | null };
  voiceSoul?: {
    language?: string; voice?: string;
    styleFormality?: number; stylePace?: number;
    tempCalm?: number; tempIntrovert?: number;
    empathy?: number; humor?: number; creativity?: number; directness?: number;
  };
  style?: Partial<AgentServerCreate["style"]>;
  voice?: Partial<AgentServerCreate["voice"]>;
  brain?: { brainId?: string; id?: string; instructions?: string | null };
  brainId?: string;
  cards?: { backgroundId?: string | null; background?: { id?: string } };
  draftId?: string | null;
  connections?: { items?: any[] };
};

const clamp01 = (v: any) =>
  typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(10, v)) : 5;
const clean = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));
const isHex = (s?: string | null) => !!s && /^[#]?[0-9a-fA-F]{3,8}$/.test(s);
const normHex = (s?: string | null) => (s ? (s.startsWith("#") ? s : `#${s}`) : null);

export function toServerAgentPayload(input: WizardStateLike | AgentServerCreate): AgentServerCreate {
  // Already server-shaped?
  if ((input as any)?.identity?.desc !== undefined && (input as any)?.voice?.language) {
    const a = input as AgentServerCreate;
    return clean({
      identity: {
        name: a.identity.name?.trim(),
        role: a.identity.role?.trim(),
        desc: a.identity.desc ?? null,
      },
      appearance: {
        personaId: a.appearance?.personaId ?? null,
        bgColor: isHex(a.appearance?.bgColor) ? normHex(a.appearance?.bgColor)! : null,
      },
      voice: { language: a.voice.language || "en", name: a.voice.name || "alex" },
      style: {
        formality: clamp01(a.style.formality),
        pace: clamp01(a.style.pace),
        calm: clamp01(a.style.calm),
        introvert: clamp01(a.style.introvert),
        empathy: clamp01(a.style.empathy),
        humor: clamp01(a.style.humor),
        creativity: clamp01(a.style.creativity),
        directness: clamp01(a.style.directness),
      },
      brain: { id: a.brain.id, instructions: a.brain.instructions ?? null },
      cards: { backgroundId: a.cards?.backgroundId ?? null },
      draftId: a.draftId ?? null,
    });
  }

  const w = input as WizardStateLike;
  const v = w.voiceSoul ?? {};
  const bg = w.appearance?.bgColor ?? w.appearance?.backgroundColor ?? null;

  return clean({
    identity: {
      name: (w.identity?.name ?? "").trim(),
      role: (w.identity?.role ?? "").trim(),
      desc: (w.identity?.description ?? null) || null,
    },
    appearance: {
      personaId: w.appearance?.personaId ?? null,
      bgColor: isHex(bg) ? normHex(bg)! : null,
    },
    voice: {
      language: (v.language || w.voice?.language || "en") as string,
      name: (v.voice || w.voice?.name || "alex") as string,
    },
    style: {
      formality: clamp01(v.styleFormality ?? w.style?.formality),
      pace: clamp01(v.stylePace ?? w.style?.pace),
      calm: clamp01(v.tempCalm ?? w.style?.calm),
      introvert: clamp01(v.tempIntrovert ?? w.style?.introvert),
      empathy: clamp01(v.empathy ?? w.style?.empathy),
      humor: clamp01(v.humor ?? w.style?.humor),
      creativity: clamp01(v.creativity ?? w.style?.creativity),
      directness: clamp01(v.directness ?? w.style?.directness),
    },
    brain: {
      id: (w.brain?.id ?? w.brain?.brainId ?? w.brainId ?? "").toString(),
      instructions: w.brain?.instructions ?? null,
    },
    cards: { backgroundId: w.cards?.backgroundId ?? w.cards?.background?.id ?? null },
    draftId: w.draftId ?? null,
  });
}

/* ----------------------- connections normalization -------------------- */
type ConnServerCreate = {
  extId: string;
  providerId: string;
  status?: "connected" | "needs_setup" | "error";
  config?: any;
  token?: string | null;
};
type ConnLike = any;

export function toServerConnectionPayload(c: ConnLike): ConnServerCreate {
  const extId =
    c?.extId ?? c?.externalId ?? (typeof c?.id === "string" ? c.id : String(c?.ext_id ?? ""));
  const providerId =
    c?.providerId ?? c?.provider?.id ?? c?.provider_key ?? c?.provider ?? "";

  return clean({
    extId: String(extId || "").trim(),
    providerId: String(providerId || "").trim(),
    status: c?.status ?? "needs_setup",
    config: c?.config ?? c?.settings ?? undefined,
    token: c?.token ?? c?.authToken ?? null,
  });
}

/* ------------------------------- Agents API --------------------------- */
export async function listAgents(): Promise<{ agents: Agent[] }> {
  return GET("/agents");
}

export async function getAgent(id: number | string): Promise<{ agent: Agent }> {
  return GET(`/agents/${id}`);
}

export async function createAgent(
  payload: AgentServerCreate | WizardStateLike
): Promise<{ agent: Agent }> {
  return POST("/agents", toServerAgentPayload(payload));
}

export async function patchAgent(
  id: number | string,
  patch: AgentServerUpdate | WizardStateLike
): Promise<{ agent: Agent }> {
  // Map wizard-shaped partials to server shape, then prune to only provided top-level keys
  const mapped = toServerAgentPayload(patch as any);
  const pruned: any = {};
  if ((patch as any).identity) pruned.identity = mapped.identity;
  if ((patch as any).appearance) pruned.appearance = mapped.appearance;
  if ((patch as any).voice || (patch as any).voiceSoul) pruned.voice = mapped.voice;
  if ((patch as any).style || (patch as any).voiceSoul) pruned.style = mapped.style;
  if ((patch as any).brain || (patch as any).brainId) pruned.brain = mapped.brain;
  if ((patch as any).cards) pruned.cards = mapped.cards;
  if ((patch as any).draftId !== undefined) pruned.draftId = mapped.draftId;
  return PATCH(`/agents/${id}`, clean(pruned));
}

export async function deleteAgent(id: number | string): Promise<{ ok: true }> {
  return DELETE_(`/agents/${id}`);
}

/* ---------------------------- Connections API ------------------------- */
export async function listConnections(agentId: number | string): Promise<{ connections: any[] }> {
  return GET(`/agents/${agentId}/connections`);
}

export async function createConnection(
  agentId: number | string,
  conn: ConnLike
): Promise<{ connection: any }> {
  return POST(`/agents/${agentId}/connections`, toServerConnectionPayload(conn));
}

export async function updateConnection(
  agentId: number | string,
  connId: number | string,
  patch: Partial<ConnLike>
): Promise<{ connection: any }> {
  const body = toServerConnectionPayload({ ...patch });
  // remove keys that weren't in the original patch
  Object.keys(body).forEach((k) => {
    if ((patch as any)[k] === undefined) delete (body as any)[k];
  });
  return PATCH(`/agents/${agentId}/connections/${connId}`, body);
}

export async function deleteConnection(
  agentId: number | string,
  connId: number | string
): Promise<{ ok: true }> {
  return DELETE_(`/agents/${agentId}/connections/${connId}`);
}

/* ---------------------- Convenience for the Wizard -------------------- */
export async function upsertConnections(agentId: number | string, items: any[] = []): Promise<void> {
  if (!Array.isArray(items) || !items.length) return;
  await Promise.all(
    items.map((c) =>
      typeof c?.id === "number"
        ? updateConnection(agentId, c.id, c)
        : createConnection(agentId, c)
    )
  );
}

export async function createAgentFromWizard(
  payload: WizardStateLike | AgentServerCreate,
  opts?: { upsertConnections?: any[] }
): Promise<{ agent: Agent }> {
  const res = await createAgent(payload);
  const agentId = (res as any)?.agent?.id ?? (res as any)?.id;
  if (agentId != null && opts?.upsertConnections?.length) {
    await upsertConnections(agentId, opts.upsertConnections);
  }
  return res;
}
