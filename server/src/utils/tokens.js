const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_TTL_DAYS } = require('../config');


function signAccessToken(user) {
	return jwt.sign({ sub: user.id, email: user.email }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}


async function issueRefreshToken(userId) {
	const token = crypto.randomBytes(48).toString('hex');
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
	await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
	return { token, expiresAt };
}


async function rotateRefreshToken(oldToken) {
	const existing = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
	if (!existing || existing.expiresAt < new Date()) return null;
	await prisma.refreshToken.delete({ where: { token: oldToken } });
	return issueRefreshToken(existing.userId);
}


module.exports = { signAccessToken, issueRefreshToken, rotateRefreshToken };