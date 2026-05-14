const { query, withTransaction } = require('../config/db');
const socket = require('../config/socket');
const { createMatchEvent } = require('../services/matchEventService');

/** GET /matches  – list upcoming and live matches */
const listMatches = async (req, res, next) => {
  try {
    const { status = 'live,scheduled' } = req.query;
    const statuses = status.split(',').map((s) => s.trim());

    const { rows } = await query(
      `SELECT m.*,
              ht.name AS home_team_name, ht.short_code AS home_code, ht.badge_color AS home_color,
              at.name AS away_team_name, at.short_code AS away_code, at.badge_color AS away_color,
              (SELECT COUNT(*) FROM match_leaderboard WHERE match_id = m.id) AS fan_count
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE m.status = ANY($1::text[])
       ORDER BY m.scheduled_at ASC`,
      [statuses]
    );
    res.json({ matches: rows });
  } catch (err) {
    next(err);
  }
};

/** GET /matches/:id  – full match detail */
const getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: [match] } = await query(
      `SELECT m.*,
              ht.name AS home_team_name, ht.short_code AS home_code, ht.badge_color AS home_color,
              at.name AS away_team_name, at.short_code AS away_code, at.badge_color AS away_color
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE m.id = $1`,
      [id]
    );

    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Fetch latest stats
    const { rows: stats } = await query(
      `SELECT ms.*, t.name AS team_name, t.short_code
       FROM match_stats ms JOIN teams t ON t.id = ms.team_id
       WHERE ms.match_id = $1`,
      [id]
    );

    // Fetch recent events
    const { rows: events } = await query(
      `SELECT me.*, t.short_code AS team_code
       FROM match_events me
       LEFT JOIN teams t ON t.id = me.team_id
       WHERE me.match_id = $1
       ORDER BY me.minute DESC, me.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Active poll
    let activePoll = null;
    if (match.active_poll_id) {
      const { rows: [poll] } = await query(
        `SELECT p.*, json_agg(
           json_build_object(
             'id', po.id, 'option_text', po.option_text,
             'display_order', po.display_order, 'vote_count', po.vote_count
           ) ORDER BY po.display_order
         ) AS options
         FROM polls p
         JOIN poll_options po ON po.poll_id = p.id
         WHERE p.id = $1
         GROUP BY p.id`,
        [match.active_poll_id]
      );
      activePoll = poll;
    }

    const viewerCount = socket.getRoomSize(`match:${id}`);

    res.json({ match, stats, events, activePoll, viewerCount });
  } catch (err) {
    next(err);
  }
};

/** POST /matches  – admin creates a match */
const createMatch = async (req, res, next) => {
  try {
    const { homeTeamId, awayTeamId, scheduledAt, venue, competition, season } = req.body;

    const { rows: [match] } = await query(
      `INSERT INTO matches (home_team_id, away_team_id, scheduled_at, venue, competition, season)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [homeTeamId, awayTeamId, scheduledAt, venue, competition, season]
    );

    // Initialise stats rows
    await query(
      `INSERT INTO match_stats (match_id, team_id) VALUES ($1,$2),($1,$3)`,
      [match.id, homeTeamId, awayTeamId]
    );

    res.status(201).json({ match });
  } catch (err) {
    next(err);
  }
};

/** POST /matches/:id/start  – admin starts match */
const startMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: [match] } = await query(
      `UPDATE matches SET status = 'live', started_at = NOW(), match_minute = 1, updated_at = NOW()
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [id]
    );

    if (!match) return res.status(400).json({ error: 'Match not found or already started' });

    await createMatchEvent({
      matchId: id,
      eventType: 'kickoff',
      minute: 1,
      description: 'Kick off!',
      isKeyMoment: false,
    });

    socket.emitMatchEvent(id, { type: 'match_started', match });
    res.json({ match });
  } catch (err) {
    next(err);
  }
};

/** POST /matches/:id/end  – admin ends match */
const endMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: [match] } = await query(
      `UPDATE matches SET status = 'finished', ended_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'live'
       RETURNING *`,
      [id]
    );

    if (!match) return res.status(400).json({ error: 'Match not in progress' });

    await createMatchEvent({
      matchId: id,
      eventType: 'fulltime',
      minute: 90,
      description: 'Full time!',
      isKeyMoment: true,
    });

    socket.emitMatchEvent(id, { type: 'match_finished', match });
    res.json({ match });
  } catch (err) {
    next(err);
  }
};

/** POST /matches/:id/events  – admin adds a live event */
const addMatchEvent = async (req, res, next) => {
  try {
    const { id: matchId } = req.params;
    const event = await createMatchEvent({ matchId, ...req.body });
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
};

/** PATCH /matches/:id/stats  – admin updates live stats */
const updateStats = async (req, res, next) => {
  try {
    const { id: matchId } = req.params;
    const { teamId, ...stats } = req.body;

    const allowed = ['possession','shots','shots_on_target','passes','corners','fouls','yellow_cards','red_cards','offsides','xg'];
    const delta = {};
    for (const key of allowed) {
      if (stats[key] !== undefined) delta[key] = stats[key];
    }

    if (!Object.keys(delta).length) {
      return res.status(400).json({ error: 'No valid stats fields provided' });
    }

    const sets   = Object.keys(delta).map((k, i) => `${k} = $${i + 3}`);
    const values = Object.values(delta);

    const { rows: [updated] } = await query(
      `UPDATE match_stats SET ${sets.join(', ')}, updated_at = NOW()
       WHERE match_id = $1 AND team_id = $2 RETURNING *`,
      [matchId, teamId, ...values]
    );

    socket.emitStatsUpdate(matchId, updated);
    res.json({ stats: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMatches,
  getMatch,
  createMatch,
  startMatch,
  endMatch,
  addMatchEvent,
  updateStats,
};
