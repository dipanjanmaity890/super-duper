import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchAPI, pollAPI, teamsAPI } from '../services/api';
import styles from './Admin.module.css';

// Demo mode API helpers
const demoAPI = {
  start:  () => fetch('/api/demo/start',  { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('fp_token')}` } }).then(r => r.json()),
  stop:   () => fetch('/api/demo/stop',   { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('fp_token')}` } }).then(r => r.json()),
  status: () => fetch('/api/demo/status', { headers: { Authorization: `Bearer ${localStorage.getItem('fp_token')}` } }).then(r => r.json()),
};

const EVENT_TYPES = [
  { value: 'goal',            label: '⚽ Goal'            },
  { value: 'yellow_card',     label: '🟡 Yellow Card'     },
  { value: 'red_card',        label: '🔴 Red Card'        },
  { value: 'penalty_awarded', label: '🟡 Penalty Awarded' },
  { value: 'penalty_scored',  label: '⚽ Penalty Scored'  },
  { value: 'penalty_missed',  label: '❌ Penalty Missed'  },
  { value: 'save',            label: '🧤 Great Save'      },
  { value: 'substitution',    label: '🔄 Substitution'    },
  { value: 'var_check',       label: '📺 VAR Check'       },
  { value: 'corner',          label: '🚩 Corner'          },
  { value: 'injury',          label: '🩺 Injury'          },
  { value: 'halftime',        label: '⏸ Half Time'       },
  { value: 'fulltime',        label: '🏁 Full Time'       },
];

const BLANK_EVENT  = { eventType: 'goal', minute: '', teamSide: 'home', playerName: '', assistName: '', description: '', isKeyMoment: true };
const BLANK_POLL   = { question: '', options: ['', ''], pointsReward: 10 };
const BLANK_STATS  = { teamSide: 'home', possession: '', shots: '', shotsOnTarget: '', passes: '', corners: '', fouls: '', xg: '' };
const BLANK_MATCH  = { homeTeamId: '', awayTeamId: '', scheduledAt: '', venue: '', competition: 'Premier League', season: '2025/26' };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [matches,     setMatches]    = useState([]);
  const [teams,       setTeams]      = useState([]);
  const [toast,       setToast]      = useState('');
  const [activePanel, setActivePanel] = useState({});
  const [eventForms,  setEventForms] = useState({});
  const [pollForms,   setPollForms]  = useState({});
  const [statsForms,  setStatsForms] = useState({});
  const [newMatch,    setNewMatch]   = useState(BLANK_MATCH);
  const [showCreate,  setShowCreate] = useState(false);
  const [busy,        setBusy]       = useState({});
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoMatchId, setDemoMatchId] = useState(null);

  if (!loading && (!user || !user.is_admin)) return <Navigate to="/" replace />;

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    try {
      const [mr, tr] = await Promise.all([
        matchAPI.list('live,scheduled,halftime,finished'),
        teamsAPI.list(),
      ]);
      setMatches(mr.matches || []);
      setTeams(tr.teams   || []);
    } catch (e) { notify('⚠ ' + e.message); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const startDemo = async () => {
    setBusy(b => ({ ...b, demo: true }));
    try {
      const res = await demoAPI.start();
      if (res.success) {
        setDemoRunning(true);
        setDemoMatchId(res.matchId);
        notify('🎬 Demo started! Watch MCF vs ARN — events fire every ~10s for 2 minutes.');
        await loadData();
        // Auto-clear after demo finishes (~2 min)
        setTimeout(() => { setDemoRunning(false); loadData(); }, 115000);
      } else {
        notify('⚠ ' + (res.error || 'Could not start demo'));
      }
    } catch (e) { notify('⚠ ' + e.message); }
    finally { setBusy(b => ({ ...b, demo: false })); }
  };

  const stopDemo = async () => {
    try { await demoAPI.stop(); setDemoRunning(false); notify('Demo stopped'); }
    catch (e) { notify('⚠ ' + e.message); }
  };

  // ── helpers ────────────────────────────────────────────────────────────────
  const setBusyKey = (k, v) => setBusy(b => ({ ...b, [k]: v }));
  const teamName   = (id) => teams.find(t => t.id === id)?.name || '–';
  const toggle     = (matchId, panel) =>
    setActivePanel(p => ({ ...p, [matchId]: p[matchId] === panel ? null : panel }));

  const getEventForm  = (id) => eventForms[id]  || { ...BLANK_EVENT };
  const getPollForm   = (id) => pollForms[id]   || { ...BLANK_POLL, options: ['', ''] };
  const getStatsForm  = (id) => statsForms[id]  || { ...BLANK_STATS };
  const setEventForm  = (id, v) => setEventForms(f  => ({ ...f, [id]: v }));
  const setPollForm   = (id, v) => setPollForms(f   => ({ ...f, [id]: v }));
  const setStatsForm  = (id, v) => setStatsForms(f  => ({ ...f, [id]: v }));

  // ── actions ────────────────────────────────────────────────────────────────
  const startMatch = async (id) => {
    setBusyKey(`start-${id}`, true);
    try { await matchAPI.start(id); notify('▶ Match started!'); await loadData(); }
    catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey(`start-${id}`, false); }
  };

  const endMatch = async (id) => {
    setBusyKey(`end-${id}`, true);
    try { await matchAPI.end(id); notify('■ Match ended'); await loadData(); }
    catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey(`end-${id}`, false); }
  };

  const addEvent = async (matchId, match) => {
    const f = getEventForm(matchId);
    if (!f.minute) return notify('Enter a minute');
    setBusyKey(`event-${matchId}`, true);
    const teamId = f.teamSide === 'home' ? match.home_team_id : match.away_team_id;
    try {
      await matchAPI.addEvent(matchId, {
        eventType:    f.eventType,
        minute:       parseInt(f.minute),
        teamId,
        playerName:   f.playerName || null,
        assistName:   f.assistName || null,
        description:  f.description || '',
        isKeyMoment:  f.isKeyMoment,
      });
      notify('✓ Event added');
      setEventForm(matchId, { ...BLANK_EVENT });
    } catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey(`event-${matchId}`, false); }
  };

  const createPoll = async (matchId) => {
    const f = getPollForm(matchId);
    if (!f.question.trim()) return notify('Enter a question');
    const opts = f.options.filter(o => o.trim());
    if (opts.length < 2) return notify('Add at least 2 options');
    setBusyKey(`poll-${matchId}`, true);
    try {
      await pollAPI.create({ matchId, question: f.question, options: opts, pointsReward: parseInt(f.pointsReward) || 10 });
      notify('✓ Poll created & live!');
      setPollForm(matchId, { ...BLANK_POLL, options: ['', ''] });
    } catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey(`poll-${matchId}`, false); }
  };

  const updateStats = async (matchId, match) => {
    const f = getStatsForm(matchId);
    const teamId = f.teamSide === 'home' ? match.home_team_id : match.away_team_id;
    const body = { teamId };
    if (f.possession      !== '') body.possession       = parseFloat(f.possession);
    if (f.shots           !== '') body.shots            = parseInt(f.shots);
    if (f.shotsOnTarget   !== '') body.shots_on_target  = parseInt(f.shotsOnTarget);
    if (f.passes          !== '') body.passes           = parseInt(f.passes);
    if (f.corners         !== '') body.corners          = parseInt(f.corners);
    if (f.fouls           !== '') body.fouls            = parseInt(f.fouls);
    if (f.xg              !== '') body.xg               = parseFloat(f.xg);
    if (Object.keys(body).length === 1) return notify('Fill in at least one stat');
    setBusyKey(`stats-${matchId}`, true);
    try {
      await matchAPI.updateStats(matchId, body);
      notify('✓ Stats updated');
    } catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey(`stats-${matchId}`, false); }
  };

  const createMatch = async () => {
    if (!newMatch.homeTeamId || !newMatch.awayTeamId) return notify('Select both teams');
    if (!newMatch.scheduledAt) return notify('Set a kickoff time');
    setBusyKey('create', true);
    try {
      await matchAPI.create({
        homeTeamId:  newMatch.homeTeamId,
        awayTeamId:  newMatch.awayTeamId,
        scheduledAt: new Date(newMatch.scheduledAt).toISOString(),
        venue:       newMatch.venue,
        competition: newMatch.competition,
        season:      newMatch.season,
      });
      notify('✓ Match created!');
      setNewMatch(BLANK_MATCH);
      setShowCreate(false);
      await loadData();
    } catch (e) { notify('⚠ ' + e.message); }
    finally { setBusyKey('create', false); }
  };

  const STATUS_META = {
    live:      { label: 'LIVE',      cls: styles.badgeLive   },
    scheduled: { label: 'Upcoming',  cls: styles.badgeBlue   },
    halftime:  { label: 'Half Time', cls: styles.badgeAmber  },
    finished:  { label: 'Full Time', cls: styles.badgePurple },
  };

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.back}>← Lobby</Link>
          <div className={styles.logo}>Fan<span className={styles.accent}>Pulse</span></div>
          <span className={styles.adminBadge}>⚙ ADMIN</span>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(s => !s)}>
          {showCreate ? '✕ Cancel' : '＋ New Match'}
        </button>
      </header>

      {/* ── Demo Mode Banner ──────────────────────────────────────────── */}
      <div className={styles.demoBanner}>
        <div className={styles.demoLeft}>
          <span className={styles.demoIcon}>🎬</span>
          <div>
            <div className={styles.demoTitle}>Hackathon Demo Mode</div>
            <div className={styles.demoSub}>Auto-runs a 2-minute scripted match: MCF vs ARN — goal, penalty, red card, VAR, polls &amp; more.</div>
          </div>
        </div>
        <div className={styles.demoActions}>
          {demoRunning && demoMatchId && (
            <a href={`/match/${demoMatchId}`} target="_blank" rel="noreferrer" className={styles.watchBtn}>
              👁 Watch Live
            </a>
          )}
          {demoRunning
            ? <button className={`${styles.actionBtn} ${styles.endBtn}`} onClick={stopDemo}>■ Stop Demo</button>
            : <button className={`${styles.actionBtn} ${styles.demoBtn}`} onClick={startDemo} disabled={busy.demo}>
                {busy.demo ? 'Starting…' : '▶ Run Demo'}
              </button>
          }
        </div>
      </div>

      {/* ── Create Match Form ─────────────────────────────────────────── */}
      {showCreate && (
        <div className={styles.createBox}>
          <div className={styles.sectionTitle}>Create Match</div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Home Team</label>
              <select value={newMatch.homeTeamId} onChange={e => setNewMatch(m => ({ ...m, homeTeamId: e.target.value }))}>
                <option value="">Select team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Away Team</label>
              <select value={newMatch.awayTeamId} onChange={e => setNewMatch(m => ({ ...m, awayTeamId: e.target.value }))}>
                <option value="">Select team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Kickoff (local time)</label>
              <input type="datetime-local" value={newMatch.scheduledAt} onChange={e => setNewMatch(m => ({ ...m, scheduledAt: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label>Venue</label>
              <input placeholder="e.g. Emirates Stadium" value={newMatch.venue} onChange={e => setNewMatch(m => ({ ...m, venue: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label>Competition</label>
              <input value={newMatch.competition} onChange={e => setNewMatch(m => ({ ...m, competition: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label>Season</label>
              <input value={newMatch.season} onChange={e => setNewMatch(m => ({ ...m, season: e.target.value }))} />
            </div>
          </div>
          <button className={styles.actionBtn} onClick={createMatch} disabled={busy.create}>
            {busy.create ? 'Creating…' : '＋ Create Match'}
          </button>
        </div>
      )}

      {/* ── Match Cards ───────────────────────────────────────────────── */}
      <div className={styles.matchList}>
        {matches.length === 0 && <div className={styles.empty}>No matches found. Create one above.</div>}
        {matches.map(m => {
          const sm = STATUS_META[m.status] || { label: m.status, cls: styles.badgeBlue };
          const panel = activePanel[m.id];
          const ef = getEventForm(m.id);
          const pf = getPollForm(m.id);
          const sf = getStatsForm(m.id);

          return (
            <div key={m.id} className={styles.matchCard}>
              {/* Card header */}
              <div className={styles.matchHeader}>
                <div className={styles.matchInfo}>
                  <span className={`${styles.badge} ${sm.cls}`}>
                    {m.status === 'live' && <span className={styles.liveDot} />}
                    {sm.label}{m.status === 'live' && ` ${m.match_minute}'`}
                  </span>
                  <span className={styles.competition}>{m.competition}</span>
                </div>
                <div className={styles.matchTeams}>
                  <span className={styles.teamName}>{m.home_team_name}</span>
                  <span className={styles.score}>
                    {m.status !== 'scheduled' ? `${m.home_score} – ${m.away_score}` : 'vs'}
                  </span>
                  <span className={styles.teamName}>{m.away_team_name}</span>
                </div>
                <div className={styles.venue}>{m.venue}</div>
              </div>

              {/* Match controls */}
              <div className={styles.controls}>
                {m.status === 'scheduled' && (
                  <button className={`${styles.actionBtn} ${styles.startBtn}`}
                    onClick={() => startMatch(m.id)} disabled={busy[`start-${m.id}`]}>
                    {busy[`start-${m.id}`] ? '…' : '▶ Start Match'}
                  </button>
                )}
                {(m.status === 'live' || m.status === 'halftime') && (
                  <button className={`${styles.actionBtn} ${styles.endBtn}`}
                    onClick={() => endMatch(m.id)} disabled={busy[`end-${m.id}`]}>
                    {busy[`end-${m.id}`] ? '…' : '■ End Match'}
                  </button>
                )}
                {(m.status === 'live' || m.status === 'halftime') && (<>
                  <button className={`${styles.panelBtn} ${panel === 'event' ? styles.panelActive : ''}`} onClick={() => toggle(m.id, 'event')}>⚡ Event</button>
                  <button className={`${styles.panelBtn} ${panel === 'poll'  ? styles.panelActive : ''}`} onClick={() => toggle(m.id, 'poll')}>📊 Poll</button>
                  <button className={`${styles.panelBtn} ${panel === 'stats' ? styles.panelActive : ''}`} onClick={() => toggle(m.id, 'stats')}>📈 Stats</button>
                </>)}
              </div>

              {/* ── Add Event Panel ─────────────────────────────────── */}
              {panel === 'event' && (
                <div className={styles.subPanel}>
                  <div className={styles.subTitle}>Add Match Event</div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label>Event Type</label>
                      <select value={ef.eventType} onChange={e => setEventForm(m.id, { ...ef, eventType: e.target.value })}>
                        {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Minute</label>
                      <input type="number" min="1" max="120" placeholder="45" value={ef.minute}
                        onChange={e => setEventForm(m.id, { ...ef, minute: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label>Team</label>
                      <select value={ef.teamSide} onChange={e => setEventForm(m.id, { ...ef, teamSide: e.target.value })}>
                        <option value="home">{m.home_team_name}</option>
                        <option value="away">{m.away_team_name}</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label>Player Name</label>
                      <input placeholder="e.g. Saka" value={ef.playerName} onChange={e => setEventForm(m.id, { ...ef, playerName: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label>Assist (optional)</label>
                      <input placeholder="e.g. Odegaard" value={ef.assistName} onChange={e => setEventForm(m.id, { ...ef, assistName: e.target.value })} />
                    </div>
                    <div className={styles.fieldCheck}>
                      <label>
                        <input type="checkbox" checked={ef.isKeyMoment} onChange={e => setEventForm(m.id, { ...ef, isKeyMoment: e.target.checked })} />
                        Key Moment (triggers reactions)
                      </label>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Description</label>
                    <input placeholder="What happened?" value={ef.description} onChange={e => setEventForm(m.id, { ...ef, description: e.target.value })} />
                  </div>
                  <button className={styles.actionBtn} onClick={() => addEvent(m.id, m)} disabled={busy[`event-${m.id}`]}>
                    {busy[`event-${m.id}`] ? 'Adding…' : '⚡ Add Event'}
                  </button>
                </div>
              )}

              {/* ── Create Poll Panel ───────────────────────────────── */}
              {panel === 'poll' && (
                <div className={styles.subPanel}>
                  <div className={styles.subTitle}>Create Live Poll</div>
                  <div className={styles.field}>
                    <label>Question</label>
                    <input placeholder="e.g. Will Arsenal score next?" value={pf.question}
                      onChange={e => setPollForm(m.id, { ...pf, question: e.target.value })} />
                  </div>
                  {pf.options.map((opt, i) => (
                    <div key={i} className={styles.field}>
                      <label>Option {i + 1}</label>
                      <input placeholder={`Option ${i + 1}`} value={opt}
                        onChange={e => {
                          const opts = [...pf.options];
                          opts[i] = e.target.value;
                          setPollForm(m.id, { ...pf, options: opts });
                        }} />
                    </div>
                  ))}
                  <button className={styles.addOptBtn}
                    onClick={() => setPollForm(m.id, { ...pf, options: [...pf.options, ''] })}>
                    ＋ Add option
                  </button>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label>Points reward</label>
                      <input type="number" value={pf.pointsReward} min="5" max="100"
                        onChange={e => setPollForm(m.id, { ...pf, pointsReward: e.target.value })} />
                    </div>
                  </div>
                  <button className={styles.actionBtn} onClick={() => createPoll(m.id)} disabled={busy[`poll-${m.id}`]}>
                    {busy[`poll-${m.id}`] ? 'Creating…' : '📊 Launch Poll'}
                  </button>
                </div>
              )}

              {/* ── Update Stats Panel ──────────────────────────────── */}
              {panel === 'stats' && (
                <div className={styles.subPanel}>
                  <div className={styles.subTitle}>Update Live Stats</div>
                  <div className={styles.field}>
                    <label>Team</label>
                    <select value={sf.teamSide} onChange={e => setStatsForm(m.id, { ...sf, teamSide: e.target.value })}>
                      <option value="home">{m.home_team_name}</option>
                      <option value="away">{m.away_team_name}</option>
                    </select>
                  </div>
                  <div className={styles.statsGrid}>
                    {[
                      ['possession', 'Possession %'],
                      ['shots', 'Shots'],
                      ['shotsOnTarget', 'On Target'],
                      ['passes', 'Passes'],
                      ['corners', 'Corners'],
                      ['fouls', 'Fouls'],
                      ['xg', 'xG'],
                    ].map(([key, label]) => (
                      <div key={key} className={styles.field}>
                        <label>{label}</label>
                        <input type="number" placeholder="–" value={sf[key]}
                          onChange={e => setStatsForm(m.id, { ...sf, [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <button className={styles.actionBtn} onClick={() => updateStats(m.id, m)} disabled={busy[`stats-${m.id}`]}>
                    {busy[`stats-${m.id}`] ? 'Updating…' : '📈 Update Stats'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
