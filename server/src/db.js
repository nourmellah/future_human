// server/src/db.js
const mysql = require('mysql2/promise');
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV,
} = require('./config');

const pool = mysql.createPool({
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
});

/**
 * Session-level setup for each new connection
 */
pool.on('connection', (conn) => {
  try {
    // use the callback or promise wrapper explicitly, but don't await here
    conn.query("SET time_zone = 'Africa/Tunis'");
    conn.query(
      "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'"
    );
    // If you prefer promises:
    // conn.promise().query("SET time_zone = '+00:00'");
    // conn.promise().query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  } catch {
    // ignore session setup errors
  }
});


/**
 * Simple health check (used by /api/health if you want DB status)
 */
async function health() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    return { ok: rows?.[0]?.ok === 1 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Optional init to verify startup connectivity
 */
async function init() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    if (NODE_ENV !== 'test') {
      console.log(`[db] Connected to ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    }
  } finally {
    conn.release();
  }
}

/**
 * Transaction helper
 * Usage:
 *   const out = await withTransaction(async (conn) => {
 *     await conn.execute('UPDATE ...', [..]);
 *     const [rows] = await conn.execute('SELECT ...', [..]);
 *     return rows;
 *   });
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Export a pool-like API for compatibility
 * (so other files can do: const db = require('../db'); db.execute(...))
 */
const db = {
  pool,
  getConnection: () => pool.getConnection(),
  query: (...args) => pool.query(...args),
  execute: (...args) => pool.execute(...args),
  withTransaction,
  init,
  health,
};

module.exports = db;
