// ─── routes/matches.js ────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/matchController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

router.get  ('/',              optionalAuth, ctrl.listMatches);
router.get  ('/:id',           optionalAuth, ctrl.getMatch);
router.post ('/',              authenticate, requireAdmin, ctrl.createMatch);
router.post ('/:id/start',     authenticate, requireAdmin, ctrl.startMatch);
router.post ('/:id/end',       authenticate, requireAdmin, ctrl.endMatch);
router.post ('/:id/events',    authenticate, requireAdmin, ctrl.addMatchEvent);
router.patch('/:id/stats',     authenticate, requireAdmin, ctrl.updateStats);

module.exports = router;
