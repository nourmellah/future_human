const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../config');

const REFRESH_COOKIE_NAME = 'rt'; // used by routes when setting/clearing cookies
const ACCESS_EXPIRES_IN = '15m';

/**
 * Sign a short-lived access token (JWT)
 * Encodes basic identity so downstream can authorize without DB hit.
 */
function signAccessToken(user) {
  // user: { id, email, name?, user_role? }
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.user_role || user.role || 'USER',
  };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Issue a new refresh token for a user and persist it.
 * If a transaction connection is provided, it will be used.
 */
async function issueRefreshToken(userId, conn = null) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const exec = conn ? conn.execute.bind(conn) : db.execute.bind(db);
  await exec(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  );

  return { token, expiresAt, userId };
}

/**
 * Rotate a refresh token atomically:
 *  - verify it exists and is not expired
 *  - delete old token
 *  - create and return a new one
 * Returns null if token invalid/expired.
 */
async function rotateRefreshToken(oldToken) {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT user_id, expires_at FROM refresh_tokens WHERE token = ? FOR UPDATE',
      [oldToken]
    );
    if (!rows.length) return null;

    const { user_id: userId, expires_at: expiresAt } = rows[0];
    if (new Date(expiresAt) < new Date()) {
      // expired: delete it and fail
      await conn.execute('DELETE FROM refresh_tokens WHERE token = ?', [oldToken]);
      return null;
    }

    // delete old & issue new
    await conn.execute('DELETE FROM refresh_tokens WHERE token = ?', [oldToken]);
    const fresh = await issueRefreshToken(userId, conn);
    return fresh; // { token, expiresAt, userId }
  });
}

/**
 * Revoke a specific refresh token
 */
async function revokeRefreshToken(token) {
  const [res] = await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  return res.affectedRows > 0;
}

/**
 * Revoke all refresh tokens for a user (force logout everywhere)
 */
async function revokeAllUserRefreshTokens(userId) {
  const [res] = await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  return res.affectedRows;
}

/**
 * Verify an access token and return payload or null
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  REFRESH_COOKIE_NAME,
  ACCESS_EXPIRES_IN,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  verifyAccessToken,
};
