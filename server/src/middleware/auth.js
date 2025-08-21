const { verifyAccessToken } = require('../utils/tokens');

/**
 * Extract Bearer token from Authorization header.
 */
function getBearer(req) {
	const auth = req.headers.authorization || '';
	const [type, token] = auth.split(' ');
	if (type?.toLowerCase() === 'bearer' && token) return token;
	return null;
}

/**
 * Auth middleware:
 *  - Verifies JWT access token
 *  - Attaches req.user = { id, email, role, iat, exp }
 */
function auth(req, res, next) {
	const token = getBearer(req);
	if (!token) {
		return res.status(401).json({ error: 'missing_token', message: 'Authorization Bearer token required' });
	}
	const payload = verifyAccessToken(token);
	if (!payload) {
		return res.status(401).json({ error: 'invalid_token', message: 'Access token is invalid or expired' });
	}
	req.user = {
		id: payload.sub,
		email: payload.email,
		role: payload.role || 'USER',
		iat: payload.iat,
		exp: payload.exp,
	};
	next();
}

/**
 * Role guard:
 *  usage: app.get('/admin', auth, requireRole('ADMIN','SUPER_ADMIN'), handler)
 */
function requireRole(...allowed) {
	const set = new Set(allowed);
	return (req, res, next) => {
		const role = req.user?.role;
		if (!role || !set.has(role)) {
			return res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
		}
		next();
	};
}

module.exports = { auth, requireRole };
