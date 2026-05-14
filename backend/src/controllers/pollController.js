const { query, withTransaction } = require('../config/db');
const socket = require('../config/socket');
const { awardPoints, POINTS, refreshRanks, getTopLeaderboard } = require('../services/pointsService');

/** POST /polls  – admin creates a poll for a match event */
const createPoll = async (req, res, next) => {
  try {
    const { matchId, matchEventId, question, pollType, options, pointsReward, closesAt } = req.body;

    if (!options || options.length < 2) {
      return res.status(400).json({ error: 'Poll requires at least 2 options' });
    }

    const result = await withTransaction(async (client) => {
      const { rows: [poll] } = await client.query(
        `INSERT INTO polls (match_id, match_event_id, question, poll_type, points_reward, closes_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [matchId, matchEventId || null, question, pollType || 'general', pointsReward || POINTS.VOTE, closesAt || null]
      );

      const opts = [];
      for (let i = 0; i < options.length; i++) {
        const { rows: [opt] } = await client.query(
          `INSERT INTO poll_options (poll_id, option_text, display_order) VALUES ($1,$2,$3) RETURNING *`,
          [poll.id, options[i], i]
        );
        opts.push(opt);
      }

      // Set as the active poll on the match
      await client.query(
        'UPDATE matches SET active_poll_id = $1, updated_at = NOW() WHERE id = $2',
        [poll.id, matchId]
      );

      return { ...poll, options: opts };
    });

    socket.emitNewPoll(matchId, result);
    res.status(201).json({ poll: result });
  } catch (err) {
    next(err);
  }
};

/** POST /polls/:id/vote  – fan casts a vote */
const vote = async (req, res, next) => {
  try {
    const { id: pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    const result = await withTransaction(async (client) => {
      // Validate poll and option
      const { rows: [poll] } = await client.query(
        `SELECT p.*, po.poll_id AS opt_poll_id
         FROM polls p
         JOIN poll_options po ON po.id = $2 AND po.poll_id = p.id
         WHERE p.id = $1 AND p.status = 'active'`,
        [pollId, optionId]
      );

      if (!poll) return { error: 'Poll not found, closed, or invalid option', status: 400 };

      // Check if already voted
      const { rows: existing } = await client.query(
        'SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [pollId, userId]
      );
      if (existing.length) return { error: 'Already voted', status: 409 };

      // Check if first voter (bonus!)
      const { rows: [{ count }] } = await client.query(
        'SELECT COUNT(*) FROM poll_votes WHERE poll_id = $1',
        [pollId]
      );
      const isFirstVoter = parseInt(count) === 0;
      const pts = poll.points_reward + (isFirstVoter ? POINTS.FIRST_VOTER_BONUS : 0);

      // Cast vote
      await client.query(
        `INSERT INTO poll_votes (poll_id, poll_option_id, user_id, points_earned) VALUES ($1,$2,$3,$4)`,
        [pollId, optionId, userId, pts]
      );

      // Increment vote count on option
      await client.query(
        'UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1',
        [optionId]
      );

      // Fetch updated options with percentages
      const { rows: opts } = await client.query(
        `SELECT po.*,
           ROUND(po.vote_count::numeric /
             NULLIF(SUM(po.vote_count) OVER (PARTITION BY po.poll_id), 0) * 100) AS pct
         FROM poll_options po WHERE po.poll_id = $1
         ORDER BY po.display_order`,
        [pollId]
      );

      // Award points
      await client.query(
        `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
        [pts, userId]
      );
      await client.query(
        `INSERT INTO match_leaderboard (match_id, user_id, points)
         VALUES ($1, $2, $3)
         ON CONFLICT (match_id, user_id) DO UPDATE SET points = match_leaderboard.points + $3, updated_at = NOW()`,
        [poll.match_id, userId, pts]
      );
      await client.query(
        `INSERT INTO points_log (user_id, match_id, action_type, points, description)
         VALUES ($1, $2, 'vote', $3, $4)`,
        [userId, poll.match_id, pts, `Voted in poll: ${poll.question}`]
      );

      await refreshRanks(client, poll.match_id);
      const top = await getTopLeaderboard(client, poll.match_id);

      return { opts, pts, isFirstVoter, matchId: poll.match_id, top };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });

    // Broadcast updates
    socket.emitPollUpdate(result.matchId, pollId, result.opts);
    socket.emitLeaderboardUpdate(result.matchId, result.top);
    socket.emitPointsEarned(userId, {
      points: result.pts,
      actionType: 'vote',
      description: result.isFirstVoter
        ? `First voter! +${result.pts} pts (incl. ${POINTS.FIRST_VOTER_BONUS} bonus)`
        : `+${result.pts} pts for voting`,
    });

    res.json({ success: true, pointsEarned: result.pts, isFirstVoter: result.isFirstVoter });
  } catch (err) {
    next(err);
  }
};

/** GET /polls/:id  – get poll with live percentages */
const getPoll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { rows: [poll] } = await query(
      'SELECT * FROM polls WHERE id = $1',
      [id]
    );
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const { rows: options } = await query(
      `SELECT po.*,
         ROUND(po.vote_count::numeric /
           NULLIF(SUM(po.vote_count) OVER (), 0) * 100) AS pct
       FROM poll_options po WHERE po.poll_id = $1
       ORDER BY po.display_order`,
      [id]
    );

    const { rows: [totalRow] } = await query(
      'SELECT SUM(vote_count) AS total FROM poll_options WHERE poll_id = $1',
      [id]
    );

    let userVote = null;
    if (userId) {
      const { rows: [v] } = await query(
        'SELECT poll_option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [id, userId]
      );
      userVote = v?.poll_option_id || null;
    }

    res.json({ poll, options, totalVotes: parseInt(totalRow.total) || 0, userVote });
  } catch (err) {
    next(err);
  }
};

/** POST /polls/:id/resolve  – admin marks correct option and awards points */
const resolvePoll = async (req, res, next) => {
  try {
    const { id: pollId } = req.params;
    const { correctOptionId } = req.body;

    await withTransaction(async (client) => {
      // Mark correct option
      await client.query(
        `UPDATE poll_options SET is_correct = (id = $1) WHERE poll_id = $2`,
        [correctOptionId, pollId]
      );

      // Award bonus points to correct voters
      const { rows: winners } = await client.query(
        `SELECT pv.user_id, p.match_id, p.points_reward
         FROM poll_votes pv
         JOIN polls p ON p.id = pv.poll_id
         WHERE pv.poll_id = $1 AND pv.poll_option_id = $2`,
        [pollId, correctOptionId]
      );

      for (const w of winners) {
        const bonus = Math.floor(w.points_reward * 0.5); // 50% bonus for correct
        await client.query(
          `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
          [bonus, w.user_id]
        );
        await client.query(
          `INSERT INTO match_leaderboard (match_id, user_id, points)
           VALUES ($1, $2, $3)
           ON CONFLICT (match_id, user_id) DO UPDATE SET points = match_leaderboard.points + $3, updated_at = NOW()`,
          [w.match_id, w.user_id, bonus]
        );

        socket.emitPointsEarned(w.user_id, {
          points: bonus,
          actionType: 'poll_correct',
          description: `Poll prediction correct! +${bonus} bonus pts`,
        });
      }

      await client.query('UPDATE polls SET status = $1 WHERE id = $2', ['resolved', pollId]);
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPoll, vote, getPoll, resolvePoll };
