const { withTransaction } = require('../config/db');
const socket = require('../config/socket');

const POINTS = {
  VOTE:                 parseInt(process.env.POINTS_VOTE)                 || 10,
  REACTION:             parseInt(process.env.POINTS_REACTION)             || 5,
  PREDICTION_STANDARD:  parseInt(process.env.POINTS_PREDICTION_STANDARD)  || 50,
  PREDICTION_UPSET:     parseInt(process.env.POINTS_PREDICTION_UPSET)     || 80,
  STREAK_BONUS:         parseInt(process.env.POINTS_STREAK_BONUS)         || 25,
  FIRST_VOTER_BONUS:    parseInt(process.env.POINTS_FIRST_VOTER_BONUS)    || 15,
};

/**
 * Award points to a user for a given action.
 * Updates users.total_points, match_leaderboard, and points_log atomically.
 * Emits socket events so the UI updates in real time.
 */
const awardPoints = async (userId, matchId, actionType, points, description, metadata = {}) => {
  if (!points || points <= 0) return null;

  const result = await withTransaction(async (client) => {
    // 1. Increment user total
    const { rows: [user] } = await client.query(
      `UPDATE users SET total_points = total_points + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, total_points`,
      [points, userId]
    );

    // 2. Upsert match leaderboard
    const { rows: [lb] } = await client.query(
      `INSERT INTO match_leaderboard (match_id, user_id, points, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (match_id, user_id)
       DO UPDATE SET points = match_leaderboard.points + $3, updated_at = NOW()
       RETURNING points`,
      [matchId, userId, points]
    );

    // 3. Audit log
    await client.query(
      `INSERT INTO points_log (user_id, match_id, action_type, points, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, matchId, actionType, points, description, JSON.stringify(metadata)]
    );

    return { user, matchPoints: lb.points };
  });

  // 4. Real-time notification to user
  try {
    socket.emitPointsEarned(userId, {
      points,
      actionType,
      description,
      totalMatchPoints: result.matchPoints,
    });
  } catch {
    // socket may not be init'd in tests
  }

  return result;
};

/**
 * Recalculate and persist rank positions for a match leaderboard.
 * Called after any points change that affects rankings.
 */
const refreshRanks = async (client, matchId) => {
  await client.query(
    `UPDATE match_leaderboard ml
     SET rank = r.rank
     FROM (
       SELECT id, RANK() OVER (PARTITION BY match_id ORDER BY points DESC) AS rank
       FROM match_leaderboard
       WHERE match_id = $1
     ) r
     WHERE ml.id = r.id`,
    [matchId]
  );
};

/**
 * Return top-N leaderboard rows for a match (used for socket broadcasts).
 */
const getTopLeaderboard = async (client, matchId, limit = 10) => {
  const { rows } = await client.query(
    `SELECT ml.rank, ml.points, u.username, u.avatar_initials, u.avatar_color
     FROM match_leaderboard ml
     JOIN users u ON u.id = ml.user_id
     WHERE ml.match_id = $1
     ORDER BY ml.points DESC
     LIMIT $2`,
    [matchId, limit]
  );
  return rows;
};

/**
 * Resolve all predictions for a given event.
 * Marks correct/incorrect, awards points, emits leaderboard update.
 */
const resolvePredictions = async (matchEventId, matchId, correctValue) => {
  await withTransaction(async (client) => {
    // Fetch all unresolved predictions for this event
    const { rows: preds } = await client.query(
      `SELECT * FROM predictions
       WHERE match_event_id = $1 AND is_resolved = FALSE`,
      [matchEventId]
    );

    for (const pred of preds) {
      const isCorrect = pred.prediction_value === correctValue;

      await client.query(
        `UPDATE predictions SET is_correct = $1, is_resolved = TRUE WHERE id = $2`,
        [isCorrect, pred.id]
      );

      if (isCorrect) {
        // Award points (higher for contrarian picks)
        const pts = pred.points_reward;

        await client.query(
          `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
          [pts, pred.user_id]
        );

        await client.query(
          `INSERT INTO match_leaderboard (match_id, user_id, points)
           VALUES ($1, $2, $3)
           ON CONFLICT (match_id, user_id)
           DO UPDATE SET points = match_leaderboard.points + $3, updated_at = NOW()`,
          [matchId, pred.user_id, pts]
        );

        await client.query(
          `INSERT INTO points_log (user_id, match_id, action_type, points, description)
           VALUES ($1, $2, 'prediction_correct', $3, $4)`,
          [pred.user_id, matchId, pts, `Correct prediction: ${pred.prediction_value}`]
        );

        try {
          socket.emitPointsEarned(pred.user_id, {
            points: pts,
            actionType: 'prediction_correct',
            description: `Prediction correct! +${pts} pts`,
          });
        } catch { /* silent */ }
      }
    }

    await refreshRanks(client, matchId);
    const top = await getTopLeaderboard(client, matchId);

    try {
      socket.emitLeaderboardUpdate(matchId, top);
    } catch { /* silent */ }
  });
};

module.exports = {
  POINTS,
  awardPoints,
  refreshRanks,
  getTopLeaderboard,
  resolvePredictions,
};
