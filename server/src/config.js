const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { z } = require('zod');

const EnvSchema = z.object({
	PORT: z.coerce.number().int().positive().default(4000),
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

	// CORS / client
	CLIENT_URL: z.string().url().default('http://localhost:5173'),

	// JWT / auth
	ACCESS_TOKEN_SECRET: z.string().min(16, 'ACCESS_TOKEN_SECRET must be strong'),
	REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

	// DB (MySQL/MariaDB)
	DB_HOST: z.string().default('127.0.0.1'),
	DB_PORT: z.coerce.number().int().positive().default(3306),
	DB_USER: z.string().default('fh'),
	DB_PASSWORD: z.string().default('change-me'),
	DB_NAME: z.string().default('future_human'),

	// Optional: comma-separated list of allowed origins for CORS
	CORS_ORIGINS: z.string().optional(), // e.g. "http://localhost:5173,http://localhost:3000"
});

const parsed = EnvSchema.safeParse({
	PORT: process.env.PORT,
	NODE_ENV: process.env.NODE_ENV,
	CLIENT_URL: process.env.CLIENT_URL,
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,
	DB_HOST: process.env.DB_HOST,
	DB_PORT: process.env.DB_PORT,
	DB_USER: process.env.DB_USER,
	DB_PASSWORD: process.env.DB_PASSWORD,
	DB_NAME: process.env.DB_NAME,
	CORS_ORIGINS: process.env.CORS_ORIGINS,
});

if (!parsed.success) {
	// Print all issues clearly, then exit to avoid half-configured server
	console.error('❌ Invalid environment configuration:');
	parsed.error.issues.forEach(i => {
		console.error(`- ${i.path.join('.')}: ${i.message}`);
	});
	process.exit(1);
}

const cfg = parsed.data;

// Build allowed origins array
const allowedOrigins = new Set(
	(cfg.CORS_ORIGINS ? cfg.CORS_ORIGINS.split(',') : [])
		.concat(cfg.CLIENT_URL)
		.map(s => s.trim())
		.filter(Boolean)
);

module.exports = {
	PORT: cfg.PORT,
	NODE_ENV: cfg.NODE_ENV,
	CLIENT_URL: cfg.CLIENT_URL,
	ACCESS_TOKEN_SECRET: cfg.ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_TTL_DAYS: cfg.REFRESH_TOKEN_TTL_DAYS,

	DB_HOST: cfg.DB_HOST,
	DB_PORT: cfg.DB_PORT,
	DB_USER: cfg.DB_USER,
	DB_PASSWORD: cfg.DB_PASSWORD,
	DB_NAME: cfg.DB_NAME,

	CORS_ALLOWED_ORIGINS: Array.from(allowedOrigins),
};
