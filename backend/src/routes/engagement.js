// ─── routes/predictions.js ────────────────────────────────────────────────────
const express    = require('express');
const predRouter = express.Router();
const predCtrl   = require('../controllers/predictionController');
const { authenticate, requireAdmin } = require('../middleware/auth');

predRouter.post('/',               authenticate,               predCtrl.submitPrediction);
predRouter.post('/:id/resolve',    authenticate, requireAdmin, predCtrl.resolvePrediction);
predRouter.get ('/match/:matchId', authenticate,               predCtrl.getUserPredictions);

module.exports.predictions = predRouter;

// ─── routes/engagement.js (reactions, feed, leaderboard, crowd pulse) ─────────
const engExpress = require('express');
const engRouter  = engExpress.Router();
const engCtrl    = require('../controllers/engagementController');
const { authenticate: auth, optionalAuth } = require('../middleware/auth');

// Reactions
engRouter.post('/reactions',               auth,         engCtrl.addReaction);
engRouter.get ('/reactions/:matchEventId', optionalAuth, engCtrl.getReactions);

// Fan feed
engRouter.post('/feed',                    auth,         engCtrl.postToFeed);
engRouter.get ('/feed/:matchId',           optionalAuth, engCtrl.getMatchFeed);

// Leaderboard
engRouter.get ('/leaderboard/global',      optionalAuth, engCtrl.getGlobalLeaderboard);
engRouter.get ('/leaderboard/:matchId',    optionalAuth, engCtrl.getMatchLeaderboard);

// Crowd emotion pulse
engRouter.post('/crowd-pulse/:matchId',    auth,         engCtrl.recordEmotionTap);
engRouter.get ('/crowd-pulse/:matchId',    optionalAuth, engCtrl.getCrowdPulse);

module.exports.engagement = engRouter;
