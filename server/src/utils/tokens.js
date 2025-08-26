const jwt = require('jsonwebtoken');
const { JWT_SECRET, ACCESS_TOKEN_TTL } = require('../config');

/**
 * Sign a short, self-contained access token.
 * Default TTL is 7 days (configurable via ACCESS_TOKEN_TTL).
 */
function signAccessToken(user, opts = {}) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  const payload = {
    sub: String(user.id),
    id: user.id,
    email: user.email,
    userRole: user.userRole || user.role || user.user_role || 'USER',
    firstName: user.firstName || user.first_name || null,
    lastName: user.lastName || user.last_name || null,
  };

  const expiresIn = opts.expiresIn || ACCESS_TOKEN_TTL || '7d';
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

/**
 * Verify a Bearer token string and return its decoded payload.
 * Throws on invalid/expired tokens.
 */
function verifyAccessToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

/**
 * Helper: extract "Bearer <token>" from Authorization header.
 * Returns the token string or null.
 */
function parseAuthHeader(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== 'string') return null;
  const [scheme, token] = h.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  parseAuthHeader,
};
