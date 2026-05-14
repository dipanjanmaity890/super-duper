// backend/src/services/demoService.js
// Runs a scripted demo sequence for hackathon judging
// Each step fires in sequence with configurable delays

const matchAPI    = require('./matchEventService');
const { query }   = require('../config/db');
const socket      = require('../config/socket');

const MATCH_ID    = 'aaaaaaaa-0000-0000-0000-000000000001'; // MCF vs ARN

const DEMO_SCRIPT = [
  // Phase 1: Kickoff
  { delay: 0,      action: 'event',  type: 'kickoff',          minute: 1,  player: null,            desc: 'Kick off! Manchester FC get us underway at the Etihad.',          key: true  },
  { delay: 4000,   action: 'stats',  teamSide: 'home',          data: { possession: 56, shots: 2, shots_on_target: 1, passes: 68, corners: 1, fouls: 0, xg: 0.18 } },
  { delay: 8000,   action: 'stats',  teamSide: 'away',          data: { possession: 44, shots: 1, shots_on_target: 0, passes: 52, corners: 0, fouls: 2, xg: 0.07 } },

  // Phase 2: First goal
  { delay: 14000,  action: 'event',  type: 'goal',              minute: 12, player: 'Kane',           desc: 'Kane volleys it home after a superb cross from the right.',        key: true  },
  { delay: 16000,  action: 'poll',   question: 'Can Arsenal equalise before half time?', options: ['Yes, they will', 'No, MCF hold firm', 'Another goal first'] },
  { delay: 22000,  action: 'stats',  teamSide: 'home',          data: { possession: 58, shots: 6, shots_on_target: 3, xg: 0.92 } },

  // Phase 3: Discipline
  { delay: 30000,  action: 'event',  type: 'yellow_card',       minute: 23, player: 'Ødegaard',       desc: 'Late challenge earns Ødegaard a booking.',                         key: false },
  { delay: 36000,  action: 'event',  type: 'save',              minute: 29, player: 'Raya',            desc: 'Raya pulls off a world-class stop to keep Arsenal in this.',       key: true  },

  // Phase 4: Penalty drama
  { delay: 44000,  action: 'event',  type: 'penalty_awarded',   minute: 38, player: null,             desc: 'Penalty! White brings down Haaland inside the box!',              key: true  },
  { delay: 52000,  action: 'event',  type: 'penalty_scored',    minute: 39, player: 'Haaland',        desc: 'Haaland steps up and buries it. 2–0. Clinical.',                  key: true  },
  { delay: 55000,  action: 'stats',  teamSide: 'home',          data: { possession: 61, shots: 11, shots_on_target: 5, xg: 2.31, corners: 4 } },

  // Phase 5: Half-time
  { delay: 62000,  action: 'event',  type: 'halftime',          minute: 45, player: null,             desc: 'Half time at the Etihad. Manchester FC lead 2–0.',                key: true  },
  { delay: 65000,  action: 'poll',   question: 'Final score prediction?', options: ['MCF 2-0 ARN', 'MCF 3-0 ARN', 'ARN pull one back', 'MCF 3-1 ARN'] },

  // Phase 6: Arsenal goal
  { delay: 74000,  action: 'event',  type: 'goal',              minute: 61, player: 'Trossard',       desc: 'Trossard fires in from the edge of the box. Game on? 2–1.',        key: true  },
  { delay: 80000,  action: 'stats',  teamSide: 'away',          data: { possession: 52, shots: 8, shots_on_target: 4, xg: 1.54, corners: 3 } },

  // Phase 7: Pressure
  { delay: 88000,  action: 'event',  type: 'var_check',         minute: 72, player: null,             desc: 'VAR checks an Arsenal goal for offside…',                         key: false },
  { delay: 96000,  action: 'event',  type: 'red_card',          minute: 78, player: 'Magalhaes',      desc: 'Red card! Arsenal down to 10 men. Magalhaes sees red.',            key: true  },

  // Phase 8: Full time
  { delay: 108000, action: 'event',  type: 'fulltime',          minute: 90, player: null,             desc: 'Full time! Manchester FC win 2–1. A dramatic finish.',            key: true  },
];

// ─── Execute one script step ──────────────────────────────────────────────────
async function executeStep(step, homeTeamId, awayTeamId) {
  if (step.action === 'event') {
    const teamId = step.teamSide === 'away'
      ? awayTeamId
      : ['save'].includes(step.type) ? awayTeamId : homeTeamId;

    const { rows: [event] } = await query(
      `INSERT INTO match_events
         (match_id, team_id, event_type, minute, player_name, description, is_key_moment)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [MATCH_ID, teamId, step.type, step.minute, step.player, step.desc, step.key]
    );

    // Update scores for goals
    if (['goal', 'penalty_scored'].includes(step.type)) {
      const col = teamId === homeTeamId ? 'home_score' : 'away_score';
      await query(`UPDATE matches SET ${col} = ${col} + 1, match_minute = $1 WHERE id = $2`, [step.minute, MATCH_ID]);
      const { rows: [m] } = await query('SELECT home_score, away_score FROM matches WHERE id=$1', [MATCH_ID]);
      socket.emitScoreUpdate(MATCH_ID, m);
    }

    // Update status
    if (step.type === 'halftime') await query(`UPDATE matches SET status='halftime', match_minute=$1 WHERE id=$2`, [step.minute, MATCH_ID]);
    if (step.type === 'fulltime') await query(`UPDATE matches SET status='finished', ended_at=NOW(), match_minute=90 WHERE id=$1`, [MATCH_ID]);
    if (!['halftime','fulltime'].includes(step.type)) await query(`UPDATE matches SET match_minute=$1 WHERE id=$2`, [step.minute, MATCH_ID]);

    try { socket.getIO().to(`match:${MATCH_ID}`).emit('match_event', { ...event, is_key_moment: step.key }); } catch {}

  } else if (step.action === 'poll') {
    const { rows: [poll] } = await query(
      `INSERT INTO polls (match_id, question, status, points_reward) VALUES ($1,$2,'active',15) RETURNING id`,
      [MATCH_ID, step.question]
    );
    const opts = await Promise.all(step.options.map((text, i) =>
      query(`INSERT INTO poll_options (poll_id, option_text, display_order) VALUES ($1,$2,$3) RETURNING *`, [poll.id, text, i])
    ));
    const fullPoll = { ...poll, options: opts.map(o => o.rows[0]), points_reward: 15 };
    try { socket.getIO().to(`match:${MATCH_ID}`).emit('new_poll', fullPoll); } catch {}

  } else if (step.action === 'stats') {
    const teamId = step.teamSide === 'away' ? awayTeamId : homeTeamId;
    const d = step.data;
    const setClauses = Object.entries(d).map(([k,v], i) => `${k} = $${i+3}`).join(', ');
    await query(
      `UPDATE match_stats SET ${setClauses}, updated_at = NOW() WHERE match_id=$1 AND team_id=$2`,
      [MATCH_ID, teamId, ...Object.values(d)]
    );
    try {
      const { rows: allStats } = await query('SELECT * FROM match_stats WHERE match_id=$1', [MATCH_ID]);
      socket.getIO().to(`match:${MATCH_ID}`).emit('stats_update', allStats.find(s => s.team_id === teamId));
    } catch {}
  }
}

// ─── Run the full demo sequence ────────────────────────────────────────────────
let demoRunning = false;
const demoTimers = [];

async function runDemo() {
  if (demoRunning) throw new Error('Demo already running');
  demoRunning = true;

  // Reset match to live
  await query(`UPDATE matches SET status='live', home_score=0, away_score=0, match_minute=1, started_at=NOW(), ended_at=NULL WHERE id=$1`, [MATCH_ID]);

  const { rows: [match] } = await query('SELECT home_team_id, away_team_id FROM matches WHERE id=$1', [MATCH_ID]);
  const { home_team_id: homeId, away_team_id: awayId } = match;

  // Fire 'match started' to all sockets
  try { socket.getIO().to(`match:${MATCH_ID}`).emit('match_event', { event_type: 'kickoff', minute: 1, is_key_moment: true, description: 'Demo mode started!' }); } catch {}

  for (const step of DEMO_SCRIPT) {
    const t = setTimeout(async () => {
      try { await executeStep(step, homeId, awayId); }
      catch (e) { console.error('[Demo] step error:', e.message); }
    }, step.delay);
    demoTimers.push(t);
  }

  // Mark demo complete after last event
  const totalDuration = DEMO_SCRIPT[DEMO_SCRIPT.length - 1].delay + 3000;
  demoTimers.push(setTimeout(() => { demoRunning = false; }, totalDuration));
}

function stopDemo() {
  demoTimers.forEach(t => clearTimeout(t));
  demoTimers.length = 0;
  demoRunning = false;
}

function isDemoRunning() { return demoRunning; }

module.exports = { runDemo, stopDemo, isDemoRunning, DEMO_MATCH_ID: MATCH_ID };
