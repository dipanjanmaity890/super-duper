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

module.exports = router;
