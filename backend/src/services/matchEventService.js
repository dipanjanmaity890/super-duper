const { withTransaction, query } = require('../config/db');
const socket = require('../config/socket');
const { refreshRanks, getTopLeaderboard } = require('./pointsService');

/**
 * Create a match event, update scores, trigger polls, and broadcast to all fans.
 */
const createMatchEvent = async ({
  matchId,
  eventType,
  minute,
  addedTime = 0,
  teamId = null,
  playerName = null,
  assistName = null,
  description = '',
  isKeyMoment = false,
  metadata = {},
}) => {
  const result = await withTransaction(async (client) => {
    // 1. Insert the event
    const { rows: [event] } = await client.query(
      `INSERT INTO match_events
         (match_id, event_type, minute, added_time, team_id, player_name, assist_name, description, is_key_moment, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [matchId, eventType, minute, addedTime, teamId, playerName, assistName, description, isKeyMoment, JSON.stringify(metadata)]
    );

    // 2. Update match state based on event type
    let scoreUpdate = null;

    if (eventType === 'goal' || eventType === 'penalty_scored') {
      const { rows: [match] } = await client.query(
        'SELECT home_team_id, away_team_id FROM matches WHERE id = $1',
        [matchId]
      );

      const isHome = teamId === match.home_team_id;
      const col    = isHome ? 'home_score' : 'away_score';

      const { rows: [updated] } = await client.query(
        `UPDATE matches SET ${col} = ${col} + 1, match_minute = $1,
         active_event_id = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING home_score, away_score`,
        [minute, event.id, matchId]
      );
      scoreUpdate = updated;

    } else if (eventType === 'own_goal') {
      const { rows: [match] } = await client.query(
        'SELECT home_team_id, away_team_id FROM matches WHERE id = $1',
        [matchId]
      );
      // Own goal scores for the other team
      const isHome = teamId === match.home_team_id;
      const col    = isHome ? 'away_score' : 'home_score';

      const { rows: [updated] } = await client.query(
        `UPDATE matches SET ${col} = ${col} + 1, match_minute = $1,
         active_event_id = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING home_score, away_score`,
        [minute, event.id, matchId]
      );
      scoreUpdate = updated;

    } else if (eventType === 'halftime') {
      await client.query(
        `UPDATE matches SET status = 'halftime', match_minute = $1, active_event_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [minute, event.id, matchId]
      );

    } else if (eventType === 'fulltime') {
      await client.query(
        `UPDATE matches SET status = 'finished', ended_at = NOW(), match_minute = $1,
         active_event_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [minute, event.id, matchId]
      );

    } else {
      await client.query(
        `UPDATE matches SET match_minute = $1, active_event_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [minute, event.id, matchId]
      );
    }

    // 3. Update yellow/red card stats
    if (eventType === 'yellow_card' && teamId) {
      await client.query(
        `UPDATE match_stats SET yellow_cards = yellow_cards + 1, updated_at = NOW()
         WHERE match_id = $1 AND team_id = $2`,
        [matchId, teamId]
      );
    }
    if (eventType === 'red_card' && teamId) {
      await client.query(
        `UPDATE match_stats SET red_cards = red_cards + 1, updated_at = NOW()
         WHERE match_id = $1 AND team_id = $2`,
        [matchId, teamId]
      );
    }

    // 4. Initialise reaction_counts rows for key moments
    if (isKeyMoment) {
      const reactionTypes = ['fire', 'shock', 'target', 'angry', 'chat'];
      for (const rt of reactionTypes) {
        await client.query(
          `INSERT INTO reaction_counts (match_event_id, reaction_type, count)
           VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
          [event.id, rt]
        );
      }
    }

    return { event, scoreUpdate };
  });

  // 5. Broadcast to match room
  try {
    socket.emitMatchEvent(matchId, result.event);

    if (result.scoreUpdate) {
      socket.emitScoreUpdate(matchId, result.scoreUpdate);
    }
  } catch { /* silent in tests */ }

  return result.event;
};

/**
 * Update live match stats and broadcast momentum change.
 */
const updateMatchStats = async (matchId, teamId, statsDelta) => {
  const setClauses = Object.entries(statsDelta)
    .map(([col], i) => `${col} = ${col} + $${i + 3}`)
    .join(', ');
  const values = Object.values(statsDelta);

  await query(
    `UPDATE match_stats SET ${setClauses}, updated_at = NOW()
     WHERE match_id = $1 AND team_id = $2`,
    [matchId, teamId, ...values]
  );

  // Recalculate momentum (simplified: possession-weighted)
  const { rows: stats } = await query(
    `SELECT team_id, possession, shots, shots_on_target FROM match_stats WHERE match_id = $1`,
    [matchId]
  );

  if (stats.length === 2) {
    const [s1, s2] = stats;
    try {
      socket.emitMomentumUpdate(matchId, {
        home: { teamId: s1.team_id, momentum: parseFloat(s1.possession) },
        away: { teamId: s2.team_id, momentum: parseFloat(s2.possession) },
      });
    } catch { /* silent */ }
  }
};

module.exports = { createMatchEvent, updateMatchStats };
