// server/src/routes/agents.js
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

/* ----------------------------- zod schemas ------------------------------ */

const nonEmpty = z.string().trim().min(1);
const styleScore = z.number().int().min(0).max(10);

const AgentCreateSchema = z.object({
  identity: z.object({
    name: nonEmpty,
    role: nonEmpty,
    companyName: z.string().optional().nullable(),
    desc: z.string().optional().nullable(),
  }),
  appearance: z.object({
    personaId: z.string().optional().nullable(),
    bgColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).optional().nullable(),
  }).partial().default({}),
  voice: z.object({
    language: nonEmpty,
    name: nonEmpty,
  }),
  style: z.object({
    formality: styleScore,
    pace: styleScore,
    calm: styleScore,
    introvert: styleScore,
    empathy: styleScore,
    humor: styleScore,
    creativity: styleScore,
    directness: styleScore,
  }),
  brain: z.object({
    id: nonEmpty,
    instructions: z.string().optional().nullable(),
  }),
  cards: z.object({
    backgroundId: z.string().optional().nullable(),
  }).partial().default({}),
  draftId: z.string().optional().nullable(),
});

const AgentUpdateSchema = AgentCreateSchema.deepPartial();

const ConnectionCreateSchema = z.object({
  extId: nonEmpty,
  providerId: nonEmpty,
  status: z.enum(['connected', 'needs_setup', 'error']).default('needs_setup'),
  config: z.any().optional(),
  token: z.string().optional().nullable(),
});

const ConnectionUpdateSchema = ConnectionCreateSchema.partial();

/* ------------------------------ mappers --------------------------------- */

function rowToAgent(r) {
  return {
    id: r.id,
    ownerId: r.owner_id,
    identity: {
      name: r.identity_name,
      role: r.identity_role,
      companyName: r.identity_company_name,
      desc: r.identity_desc,
    },
    appearance: {
      personaId: r.appearance_persona_id,
      bgColor: r.appearance_bg_color,
    },
    voice: {
      language: r.voice_language,
      name: r.voice_name,
    },
    style: {
      formality: r.style_formality,
      pace: r.style_pace,
      calm: r.temp_calm,
      introvert: r.temp_introvert,
      empathy: r.empathy,
      humor: r.humor,
      creativity: r.creativity,
      directness: r.directness,
    },
    brain: {
      id: r.brain_id,
      instructions: r.brain_instructions,
    },
    cards: {
      backgroundId: r.cards_background_id,
    },
    draftId: r.draft_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function payloadToColumns(p) {
  // Flatten nested payload to DB columns
  const cols = {};
  if (p.identity) {
    if (p.identity.name !== undefined) cols.identity_name = p.identity.name;
    if (p.identity.role !== undefined) cols.identity_role = p.identity.role;
    if (p.identity.companyName !== undefined) cols.identity_company_name = p.identity.companyName ?? null;
    if (p.identity.desc !== undefined) cols.identity_desc = p.identity.desc ?? null;
  }
  if (p.appearance) {
    if (p.appearance.personaId !== undefined) cols.appearance_persona_id = p.appearance.personaId ?? null;
    if (p.appearance.bgColor !== undefined) cols.appearance_bg_color = p.appearance.bgColor ?? null;
  }
  if (p.voice) {
    if (p.voice.language !== undefined) cols.voice_language = p.voice.language;
    if (p.voice.name !== undefined) cols.voice_name = p.voice.name;
  }
  if (p.style) {
    if (p.style.formality !== undefined) cols.style_formality = p.style.formality;
    if (p.style.pace !== undefined) cols.style_pace = p.style.pace;
    if (p.style.calm !== undefined) cols.temp_calm = p.style.calm;
    if (p.style.introvert !== undefined) cols.temp_introvert = p.style.introvert;
    if (p.style.empathy !== undefined) cols.empathy = p.style.empathy;
    if (p.style.humor !== undefined) cols.humor = p.style.humor;
    if (p.style.creativity !== undefined) cols.creativity = p.style.creativity;
    if (p.style.directness !== undefined) cols.directness = p.style.directness;
  }
  if (p.brain) {
    if (p.brain.id !== undefined) cols.brain_id = p.brain.id;
    if (p.brain.instructions !== undefined) cols.brain_instructions = p.brain.instructions ?? null;
  }
  if (p.cards) {
    if (p.cards.backgroundId !== undefined) cols.cards_background_id = p.cards.backgroundId ?? null;
  }
  if (p.draftId !== undefined) cols.draft_id = p.draftId ?? null;

  return cols;
}

function buildUpdateSQL(cols) {
  const keys = Object.keys(cols);
  if (!keys.length) return { sql: '', values: [] };
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => cols[k]);
  return { sql: sets, values };
}

/* --------------------------------- SQL ---------------------------------- */

const SELECT_BASE = `
  SELECT
    id, owner_id,
    identity_name, identity_role, identity_company_name, identity_desc,
    appearance_persona_id, appearance_bg_color,
    voice_language, voice_name,
    style_formality, style_pace, temp_calm, temp_introvert,
    pers_empathy, pers_humor, pers_creativity, pers_directness,
    brain_id, brain_instructions,
    cards_background_id,
    draft_id,
    created_at, updated_at
  FROM agents
`;

/* -------------------------------- Routes -------------------------------- */

/**
 * GET /api/agents
 * List current user's agents (latest first)
 */
router.get('/', async (req, res) => {
  const [rows] = await db.execute(
    `${SELECT_BASE} WHERE owner_id = ? ORDER BY id DESC`,
    [req.user.id]
  );
  res.json({ agents: rows.map(rowToAgent) });
});

/**
 * POST /api/agents
 * Create an agent for current user
 */
router.post('/', async (req, res) => {
  const parsed = AgentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }
  const cols = payloadToColumns(parsed.data);

  const [result] = await db.execute(
    `INSERT INTO agents (
      owner_id,
      identity_name, identity_role, identity_company_name, identity_desc,
      appearance_persona_id, appearance_bg_color,
      voice_language, voice_name,
      style_formality, style_pace, temp_calm, temp_introvert,
      pers_empathy, pers_humor, pers_creativity, pers_directness,
      brain_id, brain_instructions,
      cards_background_id,
      draft_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.user.id,
      cols.identity_name, cols.identity_role, cols.identity_company_name ?? null, cols.identity_desc ?? null,
      cols.appearance_persona_id ?? null, cols.appearance_bg_color ?? null,
      cols.voice_language, cols.voice_name,
      cols.style_formality, cols.style_pace, cols.temp_calm, cols.temp_introvert,
      cols.empathy, cols.humor, cols.creativity, cols.directness,
      cols.brain_id, cols.brain_instructions ?? null,
      cols.cards_background_id ?? null,
      cols.draft_id ?? null,
    ]
  );

  const agentId = result.insertId;
  const [rows] = await db.execute(`${SELECT_BASE} WHERE id = ?`, [agentId]);
  res.status(201).json({ agent: rowToAgent(rows[0]) });
});

/**
 * GET /api/agents/:id
 * Read one (enforce ownership)
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute(
    `${SELECT_BASE} WHERE id = ? AND owner_id = ? LIMIT 1`,
    [id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not_found' });
  res.json({ agent: rowToAgent(rows[0]) });
});

/**
 * PATCH /api/agents/:id
 * Partial update
 */
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = AgentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }
  const cols = payloadToColumns(parsed.data);
  const { sql, values } = buildUpdateSQL(cols);
  if (!sql) return res.json({}); // nothing to update

  const [result] = await db.execute(
    `UPDATE agents SET ${sql} WHERE id = ? AND owner_id = ?`,
    [...values, id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });

  const [rows] = await db.execute(`${SELECT_BASE} WHERE id = ?`, [id]);
  res.json({ agent: rowToAgent(rows[0]) });
});

/**
 * DELETE /api/agents/:id
 */
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [result] = await db.execute(
    'DELETE FROM agents WHERE id = ? AND owner_id = ?',
    [id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

/* --------------------------- Connections sub-API ------------------------- */

/**
 * GET /api/agents/:id/connections
 */
router.get('/:id/connections', async (req, res) => {
  const agentId = Number(req.params.id);
  // Ownership: ensure this agent belongs to user
  const [own] = await db.execute('SELECT id FROM agents WHERE id = ? AND owner_id = ? LIMIT 1', [agentId, req.user.id]);
  if (!own.length) return res.status(404).json({ error: 'agent_not_found' });

  const [rows] = await db.execute(
    `SELECT id, agent_id, ext_id, provider_id, status, config, token, created_at, updated_at
     FROM agent_connections WHERE agent_id = ? ORDER BY id DESC`,
    [agentId]
  );
  const connections = rows.map(r => ({
    id: r.id,
    agentId: r.agent_id,
    extId: r.ext_id,
    providerId: r.provider_id,
    status: r.status,
    config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null,
    token: r.token,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json({ connections });
});

/**
 * POST /api/agents/:id/connections
 */
router.post('/:id/connections', async (req, res) => {
  const agentId = Number(req.params.id);
  const [own] = await db.execute('SELECT id FROM agents WHERE id = ? AND owner_id = ? LIMIT 1', [agentId, req.user.id]);
  if (!own.length) return res.status(404).json({ error: 'agent_not_found' });

  const parsed = ConnectionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }
  const { extId, providerId, status, config, token } = parsed.data;

  try {
    const [result] = await db.execute(
      `INSERT INTO agent_connections (agent_id, ext_id, provider_id, status, config, token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [agentId, extId, providerId, status, config ? JSON.stringify(config) : null, token ?? null]
    );
    const [rows] = await db.execute(
      `SELECT id, agent_id, ext_id, provider_id, status, config, token, created_at, updated_at
       FROM agent_connections WHERE id = ?`,
      [result.insertId]
    );
    const r = rows[0];
    res.status(201).json({
      connection: {
        id: r.id,
        agentId: r.agent_id,
        extId: r.ext_id,
        providerId: r.provider_id,
        status: r.status,
        config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null,
        token: r.token,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    });
  } catch (e) {
    // Unique constraint on (agent_id, ext_id) could throw
    return res.status(409).json({ error: 'duplicate_ext_id', message: e.message });
  }
});

/**
 * PATCH /api/agents/:id/connections/:connId
 */
router.patch('/:id/connections/:connId', async (req, res) => {
  const agentId = Number(req.params.id);
  const connId = Number(req.params.connId);

  const [own] = await db.execute('SELECT id FROM agents WHERE id = ? AND owner_id = ? LIMIT 1', [agentId, req.user.id]);
  if (!own.length) return res.status(404).json({ error: 'agent_not_found' });

  const parsed = ConnectionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }

  const updates = {};
  const p = parsed.data;
  if (p.extId !== undefined) updates.ext_id = p.extId;
  if (p.providerId !== undefined) updates.provider_id = p.providerId;
  if (p.status !== undefined) updates.status = p.status;
  if (p.config !== undefined) updates.config = p.config ? JSON.stringify(p.config) : null;
  if (p.token !== undefined) updates.token = p.token ?? null;

  const { sql, values } = buildUpdateSQL(updates);
  if (!sql) return res.json({}); // nothing to update

  const [result] = await db.execute(
    `UPDATE agent_connections SET ${sql} WHERE id = ? AND agent_id = ?`,
    [...values, connId, agentId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'connection_not_found' });

  const [rows] = await db.execute(
    `SELECT id, agent_id, ext_id, provider_id, status, config, token, created_at, updated_at
     FROM agent_connections WHERE id = ?`,
    [connId]
  );
  const r = rows[0];
  res.json({
    connection: {
      id: r.id,
      agentId: r.agent_id,
      extId: r.ext_id,
      providerId: r.provider_id,
      status: r.status,
      config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null,
      token: r.token,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  });
});

/**
 * DELETE /api/agents/:id/connections/:connId
 */
router.delete('/:id/connections/:connId', async (req, res) => {
  const agentId = Number(req.params.id);
  const connId = Number(req.params.connId);

  const [own] = await db.execute('SELECT id FROM agents WHERE id = ? AND owner_id = ? LIMIT 1', [agentId, req.user.id]);
  if (!own.length) return res.status(404).json({ error: 'agent_not_found' });

  const [result] = await db.execute(
    'DELETE FROM agent_connections WHERE id = ? AND agent_id = ?',
    [connId, agentId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'connection_not_found' });
  res.json({ ok: true });
});

module.exports = router;
