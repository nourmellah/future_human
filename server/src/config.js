const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

/**
 * Robust .env loader:
 * 1) <repo>/server/.env        (preferred)
 * 2) <cwd>/server/.env         (when started from repo root)
 * 3) <cwd>/.env                (fallback to root .env)
 */
const CANDIDATES = [
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), 'server', '.env'),
  path.join(process.cwd(), '.env'),
];

let LOADED_ENV_PATH = null;
for (const p of CANDIDATES) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    LOADED_ENV_PATH = p;
    break;
  }
}
if (!LOADED_ENV_PATH) {
  console.warn('[config] No .env file found in:', CANDIDATES.join(' | '));
}

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
  console.error('❌ Invalid environment configuration:');
  if (LOADED_ENV_PATH) {
    console.error(`   Loaded from: ${LOADED_ENV_PATH}`);
  } else {
    console.error('   No .env file was loaded.');
  }
  parsed.error.issues.forEach((i) => {
    console.error(`- ${i.path.join('.')}: ${i.message}`);
  });
  process.exit(1);
}

const cfg = parsed.data;

// Build allowed origins array
const allowedOrigins = new Set(
  (cfg.CORS_ORIGINS ? cfg.CORS_ORIGINS.split(',') : [])
    .concat(cfg.CLIENT_URL)
    .map((s) => s.trim())
    .filter(Boolean)
);

module.exports = {
  // Debugging helper (where .env was read from)
  LOADED_ENV_PATH,

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
