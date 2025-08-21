const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = require('../config');


module.exports = function auth(req, res, next) {
	const hdr = req.headers.authorization || '';
	const [type, token] = hdr.split(' ');
	if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
		req.user = { id: payload.sub, email: payload.email };
		next();
	} catch (e) {
		return res.status(401).json({ error: 'Invalid token' });
	}
};