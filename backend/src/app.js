require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const pollRoutes    = require('./routes/polls');
const teamRoutes    = require('./routes/teams');
const cricketRoutes = require('./routes/cricket');
const demoRoutes    = require('./routes/demo');
const aiRoutes      = require('./routes/ai');
const { predictions: predRoutes, engagement: engRoutes } = require('./routes/engagement');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── Security & CORS ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/matches',     apiLimiter,  matchRoutes);
app.use('/api/polls',       apiLimiter,  pollRoutes);
app.use('/api/teams',       apiLimiter,  teamRoutes);
app.use('/api/predictions', apiLimiter,  predRoutes);
app.use('/api/cricket',     apiLimiter,  cricketRoutes);
app.use('/api/ai',          apiLimiter,  aiRoutes);
app.use('/api/demo',        apiLimiter,  demoRoutes);
app.use('/api',             apiLimiter,  engRoutes);

// ─── Error handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
