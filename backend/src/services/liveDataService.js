// ─── services/liveDataService.js ──────────────────────────────────────────────
// Polls CricAPI for live match data and syncs to PostgreSQL + Socket.io
const { query } = require('../config/db');
const socket    = require('../config/socket');

const CRICKET_API_BASE = 'https://api.cricapi.com/v1';
const API_KEY          = process.env.CRICKET_API_KEY || '';

// Score diff cache — prevents duplicate events
const scoreCache     = {};   // cric_id → { runs:{}, wickets:{} }
const milestoneCache = {};   // cric_id → Set

// ─── Fetch helper ──────────────────────────────────────────────────────────────
async function cricFetch(endpoint) {
  if (!API_KEY) throw new Error('CRICKET_API_KEY not set');
  const url = `${CRICKET_API_BASE}/${endpoint}&apikey=${API_KEY}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CricAPI ${res.status}`);
  return res.json();
}

// ─── Map CricAPI status → our status ──────────────────────────────────────────
function mapStatus(matchStarted, matchEnded) {
  if (matchEnded)   return 'finished';
  if (matchStarted) return 'live';
  return 'scheduled';
}

// ─── Detect cricket events from scorecard diff ─────────────────────────────────
function detectEvents(inningName, batting, prevCache) {
  const events = [];
  const prev   = prevCache || { wickets: {}, runs: {} };
  const next   = { wickets: { ...prev.wickets }, runs: { ...prev.runs } };

  for (const b of (batting || [])) {
    const key   = `${inningName}:${b.batsman}`;
    const runs  = parseInt(b.r) || 0;
    const prevR = prev.runs[key] || 0;

    // Milestone: 50, 100
    for (const ms of [50, 100, 150]) {
      if (prevR < ms && runs >= ms) {
        events.push({ eventType: 'milestone', description: `🏏 ${b.batsman} reaches ${ms}!`, playerName: b.batsman, isKeyMoment: ms >= 100 });
      }
    }

    // Six (runs jumped by 6+)
    if (runs - prevR >= 6 && prevR > 0) {
      events.push({ eventType: 'boundary_six', description: `💥 ${b.batsman} hits a SIX!`, playerName: b.batsman, isKeyMoment: true });
    }

    next.runs[key] = runs;

    // Wicket
    const outNow = b['dismissal-text'] && b['dismissal-text'] !== '-';
    if (outNow && !prev.wickets[key]) {
      events.push({ eventType: 'wicket', description: `🔴 OUT! ${b.batsman} — ${b['dismissal-text']}`, playerName: b.batsman, isKeyMoment: true });
      next.wickets[key] = true;
    }
  }

  return { events, next };
}

// ─── Sync one CricAPI match object into our DB ─────────────────────────────────
async function syncMatch(cricMatch) {
  const cricId = cricMatch.id;

  // Find our internal match by cric_id stored in metadata
  const { rows } = await query(
    `SELECT * FROM matches WHERE metadata->>'cric_id' = $1 LIMIT 1`,
    [cricId]
  );
  if (!rows.length) return;  // not tracked — skip

  const m         = rows[0];
  const newStatus = mapStatus(cricMatch.matchStarted, cricMatch.matchEnded);
  const scores    = cricMatch.score || [];

  // For IPL T20: inning 1 = batting team 1, inning 2 = batting team 2
  // We assign home = first batting team's score, away = second
  const inning1     = scores[0] || {};
  const inning2     = scores[1] || {};
  const homeRuns    = parseInt(inning1.r) || 0;
  const homeWickets = parseInt(inning1.w) || 0;
  const homeOvers   = parseFloat(inning1.o) || 0;
  const awayRuns    = parseInt(inning2.r) || 0;
  const awayWickets = parseInt(inning2.w) || 0;
  const awayOvers   = parseFloat(inning2.o) || 0;

  // Update match in DB
  await query(
    `UPDATE matches SET
       status       = $1,
       home_score   = $2,
       away_score   = $3,
       match_minute = $4,
       updated_at   = NOW()
     WHERE id = $5`,
    [newStatus, homeRuns, awayRuns, Math.round(homeOvers * 6), m.id]
  );

  // Broadcast to all clients watching this match
  try {
    const io = socket.getIO();
    if (io) {
      io.to(`match:${m.id}`).emit('score_update', {
        matchId:  m.id,
        home_score: homeRuns, home_wickets: homeWickets, home_overs: homeOvers,
        away_score: awayRuns, away_wickets: awayWickets, away_overs: awayOvers,
        status: newStatus,
        matchStatus: cricMatch.status,
      });
    }
  } catch { /* socket not yet ready */ }

  // Detect & emit key events
  const scorecard = cricMatch.scorecard || [];
  for (const inning of scorecard) {
    const prev = scoreCache[cricId] || { runs: {}, wickets: {} };
    const { events, next } = detectEvents(inning.inning, inning.batting, prev);
    scoreCache[cricId] = next;

    for (const ev of events) {
      try {
        // Insert match_event record
        await query(
          `INSERT INTO match_events
             (match_id, event_type, minute, description, player_name, is_key_moment, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [m.id, ev.eventType, Math.round(homeOvers * 6), ev.description,
           ev.playerName || null, ev.isKeyMoment, JSON.stringify({ source: 'cricapi' })]
        );

        // Broadcast event
        try {
          const io = socket.getIO();
          if (io) io.to(`match:${m.id}`).emit('match_event', { matchId: m.id, ...ev });
        } catch { /* */ }
      } catch (err) {
        console.error('[LiveData] event insert:', err.message);
      }
    }
  }

  console.log(`[LiveData] ✓ ${cricMatch.name} → ${newStatus} | ${homeRuns}/${homeWickets} (${homeOvers}ov) vs ${awayRuns}/${awayWickets}`);
}

// ─── Main sync: fetch currentMatches + directly poll our tracked matches ────────
async function fetchAndSync() {
  try {
    // 1. Get all our DB matches that are live or scheduled with a cric_id
    const { rows: trackedMatches } = await query(
      `SELECT metadata->>'cric_id' AS cric_id, status
       FROM matches
       WHERE metadata->>'cric_id' IS NOT NULL
         AND status IN ('scheduled', 'live')
       LIMIT 20`
    );

    if (!trackedMatches.length) {
      console.log('[LiveData] No tracked matches to sync');
      return;
    }

    // 2. Pull currentMatches from CricAPI to find which are live
    let currentIds = new Set();
    try {
      const liveData = await cricFetch('currentMatches?offset=0');
      for (const m of (liveData.data || [])) {
        currentIds.add(m.id);
        await syncMatch(m).catch(e => console.warn('[LiveData] sync warn:', e.message));
      }
    } catch (e) {
      console.warn('[LiveData] currentMatches fetch failed:', e.message);
    }

    // 3. For any tracked match NOT in currentMatches, fetch its info individually
    //    (checks if it just became live or is upcoming)
    for (const row of trackedMatches) {
      if (!row.cric_id || currentIds.has(row.cric_id)) continue;
      try {
        const info = await cricFetch(`match_info?id=${row.cric_id}`);
        if (info.data) await syncMatch({ ...info.data, id: row.cric_id }).catch(() => {});
      } catch (e) {
        // Rate limited or match not found — skip silently
      }
    }
  } catch (err) {
    console.error('[LiveData] fetchAndSync error:', err.message);
  }
}

// ─── Polling loop ──────────────────────────────────────────────────────────────
let pollTimer = null;

function start(intervalMs = 30_000) {
  if (!API_KEY) {
    console.warn('[LiveData] CRICKET_API_KEY not set — live sync disabled');
    return;
  }
  console.log(`[LiveData] Starting IPL live sync every ${intervalMs / 1000}s`);
  fetchAndSync();
  pollTimer = setInterval(fetchAndSync, intervalMs);
}

function stop() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ─── Proxy helpers used by routes/cricket.js ───────────────────────────────────
async function getLiveMatches() { return cricFetch('currentMatches?offset=0'); }
async function getScorecard(id) { return cricFetch(`match_scorecard?id=${id}`); }
async function getUpcoming()    { return cricFetch('matches?offset=0'); }
async function syncByMatchId(cricId) {
  const data = await cricFetch(`match_info?id=${cricId}`);
  if (data.data) await syncMatch({ ...data.data, id: cricId });
  return data;
}

module.exports = { start, stop, syncByMatchId, getLiveMatches, getScorecard, getUpcoming };
