// ─── routes/cricket.js ────────────────────────────────────────────────────────
// Proxy routes so the frontend never touches the API key directly
const express  = require('express');
const router   = express.Router();
const liveData = require('../services/liveDataService');
const { authenticate, requireAdmin } = require('../middleware/auth');

/** GET /cricket/live – current/live matches from CricAPI */
router.get('/live', async (req, res, next) => {
  try {
    const data = await liveData.getLiveMatches();
    res.json(data);
  } catch (err) { next(err); }
});

/** GET /cricket/upcoming – scheduled matches */
router.get('/upcoming', async (req, res, next) => {
  try {
    const data = await liveData.getUpcoming();
    res.json(data);
  } catch (err) { next(err); }
});

/** GET /cricket/scorecard/:id – full scorecard */
router.get('/scorecard/:id', async (req, res, next) => {
  try {
    const data = await liveData.getScorecard(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
});

/** POST /cricket/sync/:id – admin manually forces sync of a specific match */
router.post('/sync/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = await liveData.syncByMatchId(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/** GET /cricket/points-table – IPL 2026 standings */
router.get('/points-table', async (req, res, next) => {
  try {
    const SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';
    const API_KEY   = process.env.CRICKET_API_KEY;
    const url       = `https://api.cricapi.com/v1/series_points?apikey=${API_KEY}&id=${SERIES_ID}`;
    const resp      = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data      = await resp.json();

    if (data.status !== 'success') {
      return res.status(502).json({ error: 'CricAPI error', detail: data.status });
    }

    // Normalize to consistent shape
    const table = (data.data || []).map(row => ({
      teamName:      row.team || row.teamName || '?',
      matchesPlayed: row.matchesPlayed ?? row.p ?? 0,
      win:           row.win ?? row.w ?? 0,
      loss:          row.loss ?? row.l ?? 0,
      nrr:           row.nrr ?? row.NRR ?? '0.000',
      points:        row.points ?? row.pt ?? 0,
    })).sort((a, b) => b.points - a.points || Number(b.nrr) - Number(a.nrr));

    res.json({ table, updatedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

module.exports = router;
