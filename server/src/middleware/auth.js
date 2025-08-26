// Stateless auth middleware: validates a Bearer JWT and populates req.user.
// Use `auth` when a route requires login, and `optionalAuth` when it's nice-to-have.

const { parseAuthHeader, verifyAccessToken } = require('../utils/tokens');

/**
 * Require a valid access token. 401 on failure.
 */
function auth(req, res, next) {
  try {
    const token = parseAuthHeader(req);
    if (!token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing Bearer token',
      });
    }

    const payload = verifyAccessToken(token);
    req.user = normalizeUser(payload);
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Try to read a token, but don’t fail if it’s missing/invalid.
 * Useful for public endpoints that can personalize if logged in.
 */
function optionalAuth(req, _res, next) {
  try {
    const token = parseAuthHeader(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    req.user = normalizeUser(payload);
  } catch (_e) {
    // ignore
  }
  return next();
}

/** Ensure consistent shape on req.user */
function normalizeUser(p) {
  return {
    id: Number(p.id ?? p.sub ?? 0) || String(p.id ?? p.sub),
    email: p.email || null,
    userRole: p.userRole || 'USER',
    firstName: p.firstName || null,
    lastName: p.lastName || null,
  };
}

module.exports = { auth, optionalAuth };
