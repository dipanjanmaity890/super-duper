// ─── services/liveDataService.js ──────────────────────────────────────────────
// Polls CricAPI for live match data and syncs to our PostgreSQL + Socket.io
const { query, withTransaction } = require('../config/db');
const socket = require('../config/socket');
const { createMatchEvent } = require('./matchEventService');

const CRICKET_API_BASE = 'https://api.cricapi.com/v1';
const API_KEY          = process.env.CRICKET_API_KEY || '';

// Tracks which match IDs we've last seen scores for (prevents duplicate events)
const scoreCache = {};  // externalMatchId -> { runs: {}, wickets: {} }
const milestoneCache = {}; // externalMatchId -> Set of logged milestones

// ─── Fetch helpers ─────────────────────────────────────────────────────────────
async function cricFetch(endpoint) {
  if (!API_KEY) throw new Error('CRICKET_API_KEY not set');
  const url = `${CRICKET_API_BASE}/${endpoint}&apikey=${API_KEY}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CricAPI ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Map CricAPI status → our status ──────────────────────────────────────────
function mapStatus(matchStarted, matchEnded) {
  if (matchEnded)   return 'finished';
  if (matchStarted) return 'live';
  return 'scheduled';
}

// ─── Detect key cricket events ─────────────────────────────────────────────────
function detectEvents(externalId, inningName, batting, bowling, prevCache) {
  const events = [];
  const prev   = prevCache || { wickets: {}, runs: {} };
  const next   = { wickets: { ...prev.wickets }, runs: { ...prev.runs } };

  for (const b of (batting || [])) {
    const key  = `${inningName}:${b.batsman}`;
    const runs = parseInt(b.r) || 0;
    const prevR = prev.runs[key] || 0;

    // Milestone: 50, 100, 150...
    for (const milestone of [50, 100, 150, 200]) {
      if (prevR < milestone && runs >= milestone) {
        events.push({
          eventType:   'milestone',
          description: `${b.batsman} reaches ${milestone} in ${inningName}!`,
          playerName:  b.batsman,
          isKeyMoment: milestone >= 100,
        });
      }
    }

    // Six scored (+6 runs spike)
    if (runs - prevR >= 6 && prevR > 0) {
      events.push({
        eventType:   'boundary_six',
        description: `${b.batsman} hits a SIX! 🏏`,
        playerName:  b.batsman,
        isKeyMoment: true,
      });
    }

    next.runs[key] = runs;
  }

  // Wicket detection
  for (const b of (batting || [])) {
    const key    = `${inningName}:${b.batsman}`;
    const outNow = b['dismissal-text'] && b['dismissal-text'] !== '-';
    if (outNow && !prev.wickets[key]) {
      events.push({
        eventType:   'wicket',
        description: `OUT! ${b.batsman} — ${b['dismissal-text']}`,
        playerName:  b.batsman,
        isKeyMoment: true,
      });
      next.wickets[key] = true;
    }
  }

  return { events, next };
}

// ─── Sync a single live CricAPI match to our DB ────────────────────────────────
async function syncMatch(cricMatch) {
  const externalId = cricMatch.id;

  // Find our internal match by external_id (stored in matches.metadata->>'external_id')
  const { rows } = await query(
    `SELECT * FROM matches WHERE metadata->>'external_id' = $1 LIMIT 1`,
    [externalId]
  );
  if (!rows.length) return; // Not tracked in our system — skip

  const m           = rows[0];
  const newStatus   = mapStatus(cricMatch.matchStarted, cricMatch.matchEnded);
  const scores      = cricMatch.score || [];
  const inning1     = scores[0] || {};
  const inning2     = scores[1] || {};

  // For T20/ODI: home = bat first inning, away = bat second
  const homeRuns    = parseInt(inning1.r) || 0;
  const homeWickets = parseInt(inning1.w) || 0;
  const awayRuns    = parseInt(inning2.r) || 0;
  const awayWickets = parseInt(inning2.w) || 0;

  // Update match status + scores
  await query(
    `UPDATE matches SET
       status       = $1,
       home_score   = $2,
       away_score   = $3,
       match_minute = $4,
       updated_at   = NOW()
     WHERE id = $5`,
    [
      newStatus === 'live' ? 'live' : newStatus,
      homeRuns,
      awayRuns,
      parseInt(inning1.o) || m.match_minute || 0,
      m.id,
    ]
  );

  // Broadcast score update
  try {
    socket.emitScoreUpdate(m.id, { home_score: homeRuns, away_score: awayRuns });
    socket.emitMatchEvent(m.id, {
      type:   'score_sync',
      homeRuns, homeWickets,
      awayRuns, awayWickets,
      status: cricMatch.status,
    });
  } catch { /* socket may not be initialised */ }

  // Detect & create new key events from scorecard
  const prevCache = scoreCache[externalId];
  const scorecard = cricMatch.scorecard || [];

  for (const inning of scorecard) {
    const { events, next } = detectEvents(
      externalId,
      inning.inning,
      inning.batting,
      inning.bowling,
      prevCache
    );
    scoreCache[externalId] = next;

    for (const ev of events) {
      try {
        await createMatchEvent({
          matchId:     m.id,
          eventType:   ev.eventType,
          minute:      parseInt(inning1.o) || 0,
          description: ev.description,
          playerName:  ev.playerName || null,
          isKeyMoment: ev.isKeyMoment,
          metadata:    { source: 'cricapi', inning: inning.inning },
        });
      } catch (err) {
        console.error('[LiveData] event error:', err.message);
      }
    }
  }

  console.log(`[LiveData] Synced: ${cricMatch.name} → ${newStatus} (${homeRuns}/${homeWickets} v ${awayRuns}/${awayWickets})`);
}

// ─── Pull current matches from CricAPI ────────────────────────────────────────
async function fetchAndSync() {
  try {
    const data = await cricFetch('currentMatches?offset=0');
    const matches = data.data || [];
    for (const m of matches) {
      await syncMatch(m).catch(err =>
        console.warn(`[LiveData] syncMatch(${m.id}) failed:`, err.message)
      );
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
  console.log(`[LiveData] Starting live sync every ${intervalMs / 1000}s`);
  fetchAndSync(); // immediate first run
  pollTimer = setInterval(fetchAndSync, intervalMs);
}

function stop() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ─── Manual sync endpoint helper ──────────────────────────────────────────────
async function syncByMatchId(externalMatchId) {
  const data = await cricFetch(`match_scorecard?id=${externalMatchId}`);
  if (data.data) await syncMatch({ ...data.data, id: externalMatchId });
  return data;
}

// ─── Proxy route helpers (used by routes/cricket.js) ──────────────────────────
async function getLiveMatches() {
  return cricFetch('currentMatches?offset=0');
}

async function getScorecard(matchId) {
  return cricFetch(`match_scorecard?id=${matchId}`);
}

async function getUpcoming() {
  return cricFetch('matches?offset=0');
}

module.exports = { start, stop, syncByMatchId, getLiveMatches, getScorecard, getUpcoming };
