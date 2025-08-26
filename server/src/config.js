require('dotenv').config();

const toBool = (v, d = false) => {
  if (v === undefined) return d;
  return String(v).toLowerCase() === 'true';
};

const toNum = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// --- App / Server ---
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = toNum(process.env.PORT, 4000);

// --- Security / Auth ---
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-.env';
/**
 * Access-token lifetime for stateless auth.
 * Examples: '1h', '12h', '7d'
 */
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '7d';

// --- Hashing ---
const BCRYPT_ROUNDS = toNum(process.env.BCRYPT_ROUNDS, 10);

// --- Database (MySQL) ---
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = toNum(process.env.DB_PORT, 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'future_human';

// --- CORS ---
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CORS_CREDENTIALS = toBool(process.env.CORS_CREDENTIALS, true);

module.exports = {
  NODE_ENV,
  PORT,

  JWT_SECRET,
  ACCESS_TOKEN_TTL,

  BCRYPT_ROUNDS,

  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,

  CORS_ORIGIN,
  CORS_CREDENTIALS,
};
