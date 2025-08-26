// MySQL bootstrap + migrations (first-run create + versioned updates)

const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV,
} = require('./config');

let pool /*: mysql.Pool | undefined */;

/* -------------------------------- Utilities ------------------------------- */

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function ensureDatabaseExists() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    );
  } finally {
    await conn.end();
  }
}

async function createPool() {
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    supportBigNumbers: true,
    multipleStatements: true,
  });

  // Preserve your previous session settings on every new connection
  pool.on('connection', (conn) => {
    try {
      conn.query("SET time_zone = 'Africa/Tunis'");
      conn.query(
        "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'"
      );
    } catch {
      // ignore session setup errors
    }
  });
}

function getPool() {
  if (!pool) {
    throw new Error('[db] Not initialized. Call db.init() before using the database.');
  }
  return pool;
}

async function runInTx(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const res = await fn(conn);
    await conn.commit();
    return res;
  } catch (e) {
    try { await conn.rollback(); } catch (_) {}
    throw e;
  } finally {
    conn.release();
  }
}

/* ---------------------------- Migrations plumbing ------------------------- */

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      version VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

async function getAppliedVersions() {
  const [rows] = await getPool().query(
    'SELECT version, checksum FROM schema_migrations ORDER BY id ASC'
  );
  const map = new Map();
  for (const r of rows) map.set(r.version, r.checksum);
  return map;
}

function parseMigrationFilename(filename) {
  const m = filename.match(/^(\d{3,})_(.+)\.sql$/i);
  if (!m) return null;
  return { version: m[1], name: m[2] };
}

async function loadFsMigrations() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.toLowerCase().endsWith('.sql'));
    const parsed = [];
    for (const f of sqlFiles) {
      const meta = parseMigrationFilename(f);
      if (!meta) continue;
      const full = path.join(MIGRATIONS_DIR, f);
      const sql = await fs.readFile(full, 'utf8');
      parsed.push({
        ...meta,
        file: full,
        sql,
        checksum: sha256(sql),
      });
    }
    parsed.sort((a, b) => Number(a.version) - Number(b.version));
    return parsed;
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function recordMigration(conn, { version, name, checksum }) {
  await conn.query(
    'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
    [version, name, checksum]
  );
}

/* ------------------------------- Bootstrap -------------------------------- */

const INITIAL_SCHEMA_SQL = `
/* Minimal embedded schema for first run (extend via migrations/) */
CREATE TABLE IF NOT EXISTS users (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(191) NOT NULL,
  user_role ENUM('SUPER_ADMIN','ADMIN','USER') NOT NULL DEFAULT 'USER',
  phone_number VARCHAR(32) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  postal_code VARCHAR(20) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role (user_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS agents (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT(20) UNSIGNED NOT NULL,
  identity_name VARCHAR(191) NOT NULL,
  identity_role VARCHAR(191) NOT NULL,
  identity_company_name VARCHAR(191) DEFAULT NULL,
  identity_desc TEXT DEFAULT NULL,
  appearance_persona_id VARCHAR(191) DEFAULT NULL,
  appearance_bg_color VARCHAR(20) DEFAULT NULL,
  voice_language VARCHAR(32) NOT NULL,
  voice_name VARCHAR(64) NOT NULL,
  style_formality TINYINT(3) UNSIGNED NOT NULL,
  style_pace TINYINT(3) UNSIGNED NOT NULL,
  temp_calm TINYINT(3) UNSIGNED NOT NULL,
  temp_introvert TINYINT(3) UNSIGNED NOT NULL,
  pers_empathy TINYINT(3) UNSIGNED NOT NULL,
  pers_humor TINYINT(3) UNSIGNED NOT NULL,
  pers_creativity TINYINT(3) UNSIGNED NOT NULL,
  pers_directness TINYINT(3) UNSIGNED NOT NULL,
  brain_id VARCHAR(64) NOT NULL,
  brain_instructions TEXT DEFAULT NULL,
  cards_background_id VARCHAR(191) DEFAULT NULL,
  draft_id VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_agents_owner_id (owner_id),
  KEY ix_agents_updated_at (updated_at),
  CONSTRAINT fk_agents_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS agent_connections (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id BIGINT(20) UNSIGNED NOT NULL,
  ext_id VARCHAR(191) NOT NULL,
  provider_id VARCHAR(100) NOT NULL,
  status ENUM('connected','needs_setup','error') NOT NULL DEFAULT 'needs_setup',
  config LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(config)),
  token TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_ext_id (agent_id, ext_id),
  KEY ix_conn_agent_id (agent_id),
  CONSTRAINT fk_conn_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

async function applyInitialSchemaIfNeeded() {
  const [t1] = await getPool().query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'users'`,
    [DB_NAME]
  );
  const [t2] = await getPool().query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'agents'`,
    [DB_NAME]
  );
  const [t3] = await getPool().query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'agent_connections'`,
    [DB_NAME]
  );

  const hasUsers = t1[0]?.c > 0;
  const hasAgents = t2[0]?.c > 0;
  const hasConns = t3[0]?.c > 0;
  if (hasUsers && hasAgents && hasConns) return;

  await ensureMigrationsTable();
  await runInTx(async (conn) => {
    await conn.query(INITIAL_SCHEMA_SQL);
    await recordMigration(conn, {
      version: '000',
      name: 'embedded_init',
      checksum: sha256(INITIAL_SCHEMA_SQL),
    });
  });
}

/* ---------------------------- Built-in hotfixes --------------------------- */

async function applyBuiltInHotfixes() {
  // Remove legacy refresh_tokens table if present (moved to stateless JWTs)
  await getPool().query('DROP TABLE IF EXISTS refresh_tokens');
}

/* ---------------------------- Apply FS migrations ------------------------- */

async function applyFsMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedVersions();
  const migrations = await loadFsMigrations();

  for (const m of migrations) {
    if (applied.has(m.version)) {
      const old = applied.get(m.version);
      if (old && old !== m.checksum) {
        console.warn(
          `[migrations] WARNING checksum changed for ${m.version} (${m.name}). Was ${old}, now ${m.checksum}`
        );
      }
      continue;
    }
    console.log(`[migrations] applying ${m.version} ${m.name}`);
    await runInTx(async (conn) => {
      await conn.query(m.sql);
      await recordMigration(conn, m);
    });
    console.log(`[migrations] done ${m.version} ${m.name}`);
  }
}

/* --------------------------------- Public -------------------------------- */

/**
 * init(): first-run create DB, build pool, ping, bootstrap schema, hotfixes, and apply migrations.
 */
async function init() {
  await ensureDatabaseExists();
  await createPool();

  // Optional connectivity log (preserves previous behavior)
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
    if (NODE_ENV !== 'test') {
      console.log(`[db] Connected to ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    }
  } finally {
    conn.release();
  }

  await applyInitialSchemaIfNeeded();
  await applyBuiltInHotfixes();
  await applyFsMigrations();
}

/** Health check (preserves previous shape) */
async function health() {
  try {
    const [rows] = await getPool().query('SELECT 1 AS ok');
    return { ok: rows?.[0]?.ok === 1 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Backward-compatible helpers */
async function withTransaction(fn) {
  return runInTx(fn);
}

async function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

async function query(sql, params = []) {
  return getPool().query(sql, params);
}

module.exports = {
  // Pool object (as before)
  get pool() {
    return getPool();
  },
  getConnection: () => getPool().getConnection(),
  query,
  execute,
  withTransaction,
  init,
  health,
};
