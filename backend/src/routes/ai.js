// ─── routes/ai.js ─────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateCommentary, generateWinProbability } = require('../services/geminiService');
const liveData = require('../services/liveDataService');
const { query } = require('../config/db');

// Simple in-memory cache — 60s TTL per match
const cache = {};

/** GET /ai/commentary/:matchId — AI commentary for a match */
router.get('/commentary/:matchId', authenticate, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const now = Date.now();

    // Return cached commentary if < 60s old
    if (cache[matchId] && (now - cache[matchId].ts) < 60_000) {
      return res.json(cache[matchId].data);
    }

    // Look up match + cric_id
    const { rows: [match] } = await query(
      `SELECT m.*,
              ht.name AS home_team_name, ht.short_code AS home_code,
              at.name AS away_team_name, at.short_code AS away_code
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE m.id = $1`, [matchId]
    );

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const cricId = match.metadata?.cric_id;
    let scorecard = null;

    // Fetch live scorecard if cric_id available
    if (cricId) {
      try {
        const sc = await liveData.getScorecard(cricId);
        scorecard = sc.data || null;
      } catch { /* scorecard unavailable */ }
    }

    // Generate commentary via Gemini
    const commentary = await generateCommentary(match, scorecard);

    const data = {
      commentary,
      matchId,
      generatedAt: new Date().toISOString(),
      matchStatus: match.status,
    };

    cache[matchId] = { ts: now, data };
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /ai/winprob/:matchId — AI win probability */
router.get('/winprob/:matchId', authenticate, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const cacheKey = `wp:${matchId}`;
    const now = Date.now();

    if (cache[cacheKey] && (now - cache[cacheKey].ts) < 90_000) {
      return res.json(cache[cacheKey].data);
    }

    const { rows: [match] } = await query(
      `SELECT m.*,
              ht.name AS home_team_name, at.name AS away_team_name
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE m.id = $1`, [matchId]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const cricId = match.metadata?.cric_id;
    let scorecard = null;
    if (cricId) {
      try { const sc = await liveData.getScorecard(cricId); scorecard = sc.data; } catch {}
    }

    const prob = await generateWinProbability(match, scorecard);
    const data = { ...prob, matchId, generatedAt: new Date().toISOString() };
    cache[cacheKey] = { ts: now, data };
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
