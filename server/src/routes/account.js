const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');

const db = require('../db');
const { auth } = require('../middleware/auth');
const { revokeAllUserRefreshTokens } = require('../utils/tokens');

const router = express.Router();

// ---------- helpers ----------
function mapUserRow(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    userRole: u.user_role,
    phoneNumber: u.phone_number,
    address: u.address,
    postalCode: u.postal_code, // renamed
    country: u.country,        // renamed
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    fullName: [u.first_name, u.last_name].filter(Boolean).join(' ').trim(),
  };
}

function buildUpdateSQL(cols) {
  const keys = Object.keys(cols);
  if (!keys.length) return { sql: '', values: [] };
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => cols[k]);
  return { sql: sets, values };
}

// ---------- validation ----------
const AccountPatchSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(), // EN
  country: z.string().nullable().optional(),    // EN
  // email/userRole changes are intentionally NOT allowed here
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// ---------- routes ----------
router.use(auth);

/** GET /api/account */
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows.length) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: mapUserRow(rows[0]) });
});

/** PATCH /api/account */
router.patch('/', async (req, res) => {
  const parsed = AccountPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }

  const { firstName, lastName, phoneNumber, address, postalCode, country } = parsed.data;

  // Flatten to DB columns (EN)
  const updates = {};
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
  if (address !== undefined) updates.address = address;
  if (postalCode !== undefined) updates.postal_code = postalCode;
  if (country !== undefined) updates.country = country;

  const { sql, values } = buildUpdateSQL(updates);
  if (!sql) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    return res.json({ user: mapUserRow(rows[0]) });
  }

  const [result] = await db.execute(
    `UPDATE users SET ${sql} WHERE id = ?`,
    [...values, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });

  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
  return res.json({ user: mapUserRow(rows[0]) });
});

/** PATCH /api/account/password */
router.patch('/password', async (req, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
  }
  const { currentPassword, newPassword } = parsed.data;

  const [rows] = await db.execute(
    'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not_found' });

  const { password_hash: hash } = rows[0];
  const ok = await bcrypt.compare(currentPassword, hash);
  if (!ok) return res.status(400).json({ error: 'invalid_current_password' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

  await revokeAllUserRefreshTokens(req.user.id);

  return res.json({ ok: true });
});

module.exports = router;
