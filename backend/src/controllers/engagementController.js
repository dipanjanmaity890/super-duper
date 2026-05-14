const { query, withTransaction } = require('../config/db');
const socket = require('../config/socket');
const { awardPoints, POINTS, refreshRanks, getTopLeaderboard } = require('../services/pointsService');

// ─── REACTIONS ────────────────────────────────────────────────────────────────
const VALID_REACTIONS = ['fire', 'shock', 'target', 'angry', 'chat'];

const addReaction = async (req, res, next) => {
  try {
    const { matchId, matchEventId, reactionType } = req.body;
    const userId = req.user.id;

    if (!VALID_REACTIONS.includes(reactionType)) {
      return res.status(400).json({ error: `reactionType must be one of: ${VALID_REACTIONS.join(', ')}` });
    }

    const result = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO reactions (match_id, match_event_id, user_id, reaction_type) VALUES ($1,$2,$3,$4)`,
        [matchId, matchEventId, userId, reactionType]
      );
      const { rows: [count] } = await client.query(
        `INSERT INTO reaction_counts (match_event_id, reaction_type, count) VALUES ($1,$2,1)
         ON CONFLICT (match_event_id, reaction_type) DO UPDATE SET count = reaction_counts.count + 1 RETURNING count`,
        [matchEventId, reactionType]
      );
      const { rows: allCounts } = await client.query(
        `SELECT reaction_type, count FROM reaction_counts WHERE match_event_id = $1`,
        [matchEventId]
      );
      await client.query(`UPDATE users SET total_points = total_points + $1 WHERE id = $2`, [POINTS.REACTION, userId]);
      await client.query(
        `INSERT INTO match_leaderboard (match_id, user_id, points) VALUES ($1,$2,$3)
         ON CONFLICT (match_id, user_id) DO UPDATE SET points = match_leaderboard.points + $3, updated_at = NOW()`,
        [matchId, userId, POINTS.REACTION]
      );
      await client.query(
        `INSERT INTO points_log (user_id, match_id, action_type, points, description) VALUES ($1,$2,'reaction',$3,'Reacted to match moment')`,
        [userId, matchId, POINTS.REACTION]
      );
      return { counts: allCounts, thisCount: count.count };
    });

    socket.emitReactionUpdate(matchId, matchEventId, result.counts);
    socket.emitPointsEarned(userId, { points: POINTS.REACTION, actionType: 'reaction', description: `+${POINTS.REACTION} pts for reacting` });
    res.json({ success: true, pointsEarned: POINTS.REACTION, counts: result.counts });
  } catch (err) { next(err); }
};

const getReactions = async (req, res, next) => {
  try {
    const { matchEventId } = req.params;
    const { rows } = await query('SELECT reaction_type, count FROM reaction_counts WHERE match_event_id = $1', [matchEventId]);
    const counts = {};
    for (const r of rows) counts[r.reaction_type] = parseInt(r.count);
    res.json({ counts });
  } catch (err) { next(err); }
};

// ─── FAN FEED ─────────────────────────────────────────────────────────────────
const postToFeed = async (req, res, next) => {
  try {
    const { matchId, content, postType } = req.body;
    const userId = req.user.id;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
    if (content.length > 280) return res.status(400).json({ error: 'Content must be ≤280 characters' });

    const { rows: [post] } = await query(
      `INSERT INTO fan_feed_posts (match_id, user_id, content, post_type) VALUES ($1,$2,$3,$4) RETURNING *`,
      [matchId, userId, content.trim(), postType || 'comment']
    );
    const { rows: [user] } = await query('SELECT username, avatar_initials, avatar_color FROM users WHERE id = $1', [userId]);
    const richPost = { ...post, ...user };
    socket.emitFeedPost(matchId, richPost);
    res.status(201).json({ post: richPost });
  } catch (err) { next(err); }
};

const getMatchFeed = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await query(
      `SELECT fp.*, u.username, u.avatar_initials, u.avatar_color,
              ml.points AS user_match_points, ml.rank AS user_rank
       FROM fan_feed_posts fp
       JOIN users u ON u.id = fp.user_id
       LEFT JOIN match_leaderboard ml ON ml.match_id = fp.match_id AND ml.user_id = fp.user_id
       WHERE fp.match_id = $1 ORDER BY fp.created_at DESC LIMIT $2 OFFSET $3`,
      [matchId, limit, offset]
    );
    res.json({ posts: rows });
  } catch (err) { next(err); }
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
const getMatchLeaderboard = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const userId = req.user?.id;
    const { rows } = await query(
      `SELECT ml.rank, ml.points, u.username, u.avatar_initials, u.avatar_color
       FROM match_leaderboard ml JOIN users u ON u.id = ml.user_id
       WHERE ml.match_id = $1 ORDER BY ml.points DESC LIMIT $2`,
      [matchId, limit]
    );
    let myEntry = null;
    if (userId) {
      const { rows: [me] } = await query(
        `SELECT ml.rank, ml.points FROM match_leaderboard ml WHERE ml.match_id = $1 AND ml.user_id = $2`,
        [matchId, userId]
      );
      myEntry = me || { rank: null, points: 0 };
    }
    const { rows: [{ count }] } = await query('SELECT COUNT(*) FROM match_leaderboard WHERE match_id = $1', [matchId]);
    res.json({ leaderboard: rows, myEntry, totalFans: parseInt(count) });
  } catch (err) { next(err); }
};

const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await query(
      `SELECT username, avatar_initials, avatar_color, total_points FROM users ORDER BY total_points DESC LIMIT $1`,
      [limit]
    );
    res.json({ leaderboard: rows });
  } catch (err) { next(err); }
};

// ─── CROWD EMOTION PULSE ──────────────────────────────────────────────────────
// In-memory aggregator – fast, real-time, no persistence needed
const crowdPulseStore = {};

const initPulse = (matchId) => {
  if (!crowdPulseStore[matchId]) {
    crowdPulseStore[matchId] = {
      home: { tense: 0, excited: 50, anxious: 0, frustrated: 0, total: 50 },
      away: { tense: 0, excited: 40, anxious: 0, frustrated: 0, total: 40 },
      homeIntensity: 62,
      awayIntensity: 54,
      lastUpdated: Date.now(),
    };
  }
  return crowdPulseStore[matchId];
};

const getDominant = (side) => {
  const { total, ...emotions } = side;
  if (total === 0) return 'excited';
  return Object.entries(emotions).sort(([, a], [, b]) => b - a)[0][0];
};

const recordEmotionTap = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { emotion, teamSide } = req.body;

    const VALID_EMOTIONS = ['tense', 'excited', 'anxious', 'frustrated'];
    if (!VALID_EMOTIONS.includes(emotion))  return res.status(400).json({ error: 'Invalid emotion' });
    if (!['home','away'].includes(teamSide)) return res.status(400).json({ error: 'teamSide must be home or away' });

    const pulse = initPulse(matchId);
    const now = Date.now();
    const secsSince = (now - pulse.lastUpdated) / 1000;

    pulse[teamSide][emotion]++;
    pulse[teamSide].total++;

    // Exponential decay + new tap boost
    const decay = Math.exp(-secsSince / 90);
    if (teamSide === 'home') {
      pulse.homeIntensity = Math.min(99, Math.max(10, pulse.homeIntensity * decay + 3));
    } else {
      pulse.awayIntensity = Math.min(99, Math.max(10, pulse.awayIntensity * decay + 3));
    }
    pulse.lastUpdated = now;

    const payload = {
      homeIntensity:        Math.round(pulse.homeIntensity),
      awayIntensity:        Math.round(pulse.awayIntensity),
      homeDominantEmotion:  getDominant(pulse.home),
      awayDominantEmotion:  getDominant(pulse.away),
    };

    try { socket.getIO().to(`match:${matchId}`).emit('crowd_pulse_update', payload); } catch { /* silent */ }
    res.json({ success: true, pulse: payload });
  } catch (err) { next(err); }
};

const getCrowdPulse = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const pulse = initPulse(matchId);
    res.json({
      homeIntensity:        Math.round(pulse.homeIntensity),
      awayIntensity:        Math.round(pulse.awayIntensity),
      homeDominantEmotion:  getDominant(pulse.home),
      awayDominantEmotion:  getDominant(pulse.away),
    });
  } catch (err) { next(err); }
};

module.exports = {
  addReaction, getReactions,
  postToFeed, getMatchFeed,
  getMatchLeaderboard, getGlobalLeaderboard,
  recordEmotionTap, getCrowdPulse,
};
