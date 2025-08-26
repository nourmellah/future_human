const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { signAccessToken } = require('../utils/tokens');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* ------------------------ Schemas ------------------------ */
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

/* ------------------------ Helpers ------------------------ */
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

/* ------------------------ Routes ------------------------ */

/**
 * POST /api/auth/register
 * Creates a user and returns a signed access token (no cookies, no refresh).
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // Uniqueness
  const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) {
    return res.status(409).json({ error: 'email_exists' });
  }

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
  return res.status(201).json({ user, accessToken });
});

/**
 * POST /api/auth/login
 * Verifies credentials and returns a signed access token (no cookies, no refresh).
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
  return res.json({ user, accessToken });
});

/**
 * GET /api/auth/me
 * Uses Bearer token (via auth middleware) to return the latest user record.
 */
router.get('/me', auth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.json({ user: null });

  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows.length) return res.json({ user: null });

  return res.json({ user: mapUserRow(rows[0]) });
});

/**
 * POST /api/auth/logout
 * Stateless JWTs can't be "logged out" server-side without a blocklist.
 * This endpoint exists for client UX; just return ok.
 */
router.post('/logout', async (_req, res) => {
  return res.json({ ok: true });
});

module.exports = router;
