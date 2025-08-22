const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const db = require('./db');
const { PORT, NODE_ENV, CORS_ALLOWED_ORIGINS } = require('./config');

const app = express();
// app.use(cors({ origin: true, credentials: true })); /** TEMPORARY !!!!! */

/** CORS: allow your client origins + credentials (cookies) */
const corsOptions = {
  origin(origin, cb) {
    // Allow tools (curl/postman) with no Origin
    if (!origin) return cb(null, true);
    // Allow any of the whitelisted dev origins
    if (CORS_ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// If you deploy behind a proxy (e.g., Nginx/Heroku), uncomment:
// app.set('trust proxy', 1);

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const accountRoutes = require('./routes/account');

/** Health endpoint (+ DB ping) */
app.get('/api/health', async (_req, res) => {
  const dbStatus = await db.health();
  res.json({
    ok: true,
    env: NODE_ENV,
    db: dbStatus,
  });
});

/** Routes */
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/account', accountRoutes);

/** 404 */
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.originalUrl });
});

/** Error handler */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (NODE_ENV !== 'test') {
    console.error('[error]', status, err.message);
  }
  res.status(status).json({
    error: 'server_error',
    message: NODE_ENV === 'production' ? 'Internal error' : err.message,
  });
});

/** Start */
(async () => {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
})();
