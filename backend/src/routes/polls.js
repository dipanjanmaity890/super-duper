// ─── routes/polls.js ──────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/pollController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

router.post('/',              authenticate, requireAdmin, ctrl.createPoll);
router.get ('/:id',           optionalAuth,              ctrl.getPoll);
router.post('/:id/vote',      authenticate,              ctrl.vote);
router.post('/:id/resolve',   authenticate, requireAdmin, ctrl.resolvePoll);

module.exports = router;
