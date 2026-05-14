const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const demo = require('../services/demoService');

/** POST /demo/start — kick off the automated demo sequence */
router.post('/start', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (demo.isDemoRunning()) return res.status(409).json({ error: 'Demo already running' });
    await demo.runDemo();
    res.json({ success: true, message: 'Demo started — watch the match page for live events!', matchId: demo.DEMO_MATCH_ID });
  } catch (err) { next(err); }
});

/** POST /demo/stop — cancel the demo */
router.post('/stop', authenticate, requireAdmin, (req, res) => {
  demo.stopDemo();
  res.json({ success: true, message: 'Demo stopped' });
});

/** GET /demo/status */
router.get('/status', authenticate, requireAdmin, (req, res) => {
  res.json({ running: demo.isDemoRunning(), matchId: demo.DEMO_MATCH_ID });
});

module.exports = router;
