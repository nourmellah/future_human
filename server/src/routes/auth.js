const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  REFRESH_COOKIE_NAME,
} = require('../utils/tokens');
const { NODE_ENV, REFRESH_TOKEN_TTL_DAYS } = require('../config');

const router = express.Router();

const registerSchema = z.object({
  firstName: z.string().min(1, 'firstName is required'),
  lastName: z.string().min(1, 'lastName is required'),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, // ms
};

function mapUserRow(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    userRole: u.user_role,
    phoneNumber: u.phone_number,
    address: u.address,
    postalCode: u.postal_code,
    country: u.country,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    fullName: [u.first_name, u.last_name].filter(Boolean).join(' ').trim(),
  };
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // email uniqueness
  const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) return res.status(409).json({ error: 'email_exists' });

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [result] = await db.execute(
    `INSERT INTO users
     (first_name, last_name, email, password_hash, user_role, phone_number, address, postal_code, country)
     VALUES (?, ?, ?, ?, 'USER', ?, ?, ?, ?)`,
    [
      data.firstName,
      data.lastName,
      email,
      passwordHash,
      data.phoneNumber ?? null,
      data.address ?? null,
      data.postalCode ?? null,
      data.country ?? null,
    ]
  );

  const userId = result.insertId;
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
  const user = mapUserRow(rows[0]);

  const accessToken = signAccessToken(user);
  const { token: refreshToken } = await issueRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);
  return res.status(201).json({ user, accessToken });
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email.toLowerCase().trim()]
  );
  if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });

  const u = rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const user = mapUserRow(u);
  const accessToken = signAccessToken(user);
  const { token: refreshToken } = await issueRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);
  return res.json({ user, accessToken });
});

/**
 * POST /api/auth/refresh
 * Rotates refresh token cookie and returns a fresh access token.
 */
router.post('/refresh', async (req, res) => {
  const old = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!old) return res.status(401).json({ error: 'missing_refresh' });

  const rotated = await rotateRefreshToken(old);
  if (!rotated) return res.status(401).json({ error: 'invalid_refresh' });

  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [rotated.userId]);
  if (!rows.length) return res.status(401).json({ error: 'user_not_found' });

  const user = mapUserRow(rows[0]);
  const accessToken = signAccessToken(user);

  res.cookie(REFRESH_COOKIE_NAME, rotated.token, cookieOpts);
  return res.json({ accessToken });
});

/**
 * POST /api/auth/logout
 * Clears cookie and deletes stored refresh token.
 */
router.post('/logout', async (req, res) => {
  const rt = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rt) {
    await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [rt]);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOpts);
  return res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * If a valid refresh token cookie exists and is not expired, return user (lightweight session).
 */
router.get('/me', async (req, res) => {
  const rt = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rt) return res.json({ user: null });

  const [rows] = await db.execute(
    `SELECT u.* FROM refresh_tokens r
     JOIN users u ON u.id = r.user_id
     WHERE r.token = ? AND r.expires_at > NOW()
     LIMIT 1`,
    [rt]
  );

  if (!rows.length) return res.json({ user: null });
  return res.json({ user: mapUserRow(rows[0]) });
});

module.exports = router;
