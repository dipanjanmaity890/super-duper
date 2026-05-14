// ─── predictionController.js ──────────────────────────────────────────────────
const { query, withTransaction } = require('../config/db');
const socket = require('../config/socket');
const { POINTS, awardPoints, resolvePredictions } = require('../services/pointsService');

/** POST /predictions  – fan submits a prediction */
const submitPrediction = async (req, res, next) => {
  try {
    const { matchId, matchEventId, predictionType, predictionValue, pointsReward } = req.body;
    const userId = req.user.id;

    const pts = pointsReward || POINTS.PREDICTION_STANDARD;

    const { rows: [pred] } = await query(
      `INSERT INTO predictions (match_id, match_event_id, user_id, prediction_type, prediction_value, points_reward)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [matchId, matchEventId || null, userId, predictionType, predictionValue, pts]
    );

    res.status(201).json({ prediction: pred, possiblePoints: pts });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already submitted a prediction for this event' });
    }
    next(err);
  }
};

/** POST /predictions/:id/resolve  – admin resolves outcome */
const resolvePrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { correctValue } = req.body;

    const { rows: [pred] } = await query('SELECT * FROM predictions WHERE id = $1', [id]);
    if (!pred) return res.status(404).json({ error: 'Prediction not found' });

    await resolvePredictions(pred.match_event_id, pred.match_id, correctValue);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** GET /predictions/match/:matchId  – user's predictions for a match */
const getUserPredictions = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const { rows } = await query(
      `SELECT * FROM predictions WHERE match_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [matchId, userId]
    );
    res.json({ predictions: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitPrediction, resolvePrediction, getUserPredictions };
