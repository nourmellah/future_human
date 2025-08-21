import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

/* ============================== Types ============================== */

export type AgentIdentity = {
  name: string;
  role: string;
  desc?: string | null;
};

export type AgentAppearance = {
  personaId?: string | null;
  bgColor?: string | null; // e.g. '#111111'
};

export type AgentVoice = {
  language: string; // e.g. 'en'
  name: string;     // e.g. 'alloy'
};

export type AgentStyle = {
  formality: number;  // 0..10
  pace: number;       // 0..10
  calm: number;       // 0..10
  introvert: number;  // 0..10
  empathy: number;    // 0..10
  humor: number;      // 0..10
  creativity: number; // 0..10
  directness: number; // 0..10
};

export type AgentBrain = {
  id: string;
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
  voice: AgentVoice;
  style: AgentStyle;
  brain: AgentBrain;
  cards: AgentCards;
  draftId?: string | null;
  createdAt: string; // ISO from server
  updatedAt: string; // ISO from server
};

/** Create payload matches server expectation exactly */
export type AgentCreateInput = {
  identity: AgentIdentity;
  appearance?: AgentAppearance;
  voice: AgentVoice;
  style: AgentStyle;
  brain: AgentBrain;
  cards?: AgentCards;
  draftId?: string | null;
};

/** Update = deep partial */
export type AgentUpdateInput = Partial<{
  identity: Partial<AgentIdentity>;
  appearance: Partial<AgentAppearance>;
  voice: Partial<AgentVoice>;
  style: Partial<AgentStyle>;
  brain: Partial<AgentBrain>;
  cards: Partial<AgentCards>;
  draftId: string | null;
}>;

/* Connections */
export type AgentConnection = {
  id: number;
  agentId: number;
  extId: string;
  providerId: string;
  status: 'connected' | 'needs_setup' | 'error';
  config: any | null;
  token: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionCreateInput = {
  extId: string;
  providerId: string;
  status?: 'connected' | 'needs_setup' | 'error';
  config?: any;
  token?: string | null;
};

export type ConnectionUpdateInput = Partial<ConnectionCreateInput>;

/* ============================== Agents ============================= */

export async function listAgents(): Promise<Agent[]> {
  const { agents } = await apiGet<{ agents: Agent[] }>('/agents');
  return agents;
}

export async function getAgent(id: number): Promise<Agent> {
  const { agent } = await apiGet<{ agent: Agent }>(`/agents/${id}`);
  return agent;
}

export async function createAgent(payload: AgentCreateInput): Promise<Agent> {
  const { agent } = await apiPost<{ agent: Agent }>('/agents', payload);
  return agent;
}

export async function updateAgent(id: number, patch: AgentUpdateInput): Promise<Agent> {
  const { agent } = await apiPatch<{ agent: Agent }>(`/agents/${id}`, patch);
  return agent;
}

export async function deleteAgent(id: number): Promise<void> {
  await apiDelete(`/agents/${id}`);
}

/* ============================ Connections ========================== */

export async function listConnections(agentId: number): Promise<AgentConnection[]> {
  const { connections } = await apiGet<{ connections: AgentConnection[] }>(
    `/agents/${agentId}/connections`
  );
  return connections;
}

export async function addConnection(
  agentId: number,
  payload: ConnectionCreateInput
): Promise<AgentConnection> {
  const { connection } = await apiPost<{ connection: AgentConnection }>(
    `/agents/${agentId}/connections`,
    payload
  );
  return connection;
}

export async function updateConnection(
  agentId: number,
  connId: number,
  patch: ConnectionUpdateInput
): Promise<AgentConnection> {
  const { connection } = await apiPatch<{ connection: AgentConnection }>(
    `/agents/${agentId}/connections/${connId}`,
    patch
  );
  return connection;
}

export async function deleteConnection(agentId: number, connId: number): Promise<void> {
  await apiDelete(`/agents/${agentId}/connections/${connId}`);
}
