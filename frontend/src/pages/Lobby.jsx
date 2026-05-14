import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Lobby.module.css';

const STATUS_BADGE = {
  live:      { label: 'LIVE',      cls: 'badge-red'    },
  scheduled: { label: 'Upcoming',  cls: 'badge-blue'   },
  halftime:  { label: 'Innings',   cls: 'badge-amber'  },
  finished:  { label: 'Completed', cls: 'badge-purple' },
};

// Detect sport from competition name
const isCricket = (comp = '') =>
  /ipl|cricket|t20|odi|test|premier league.*india/i.test(comp);

// Format scheduled date nicely
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
}

// Group matches by competition
function groupByComp(matches) {
  const groups = {};
  for (const m of matches) {
    const key = m.competition || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return groups;
}

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('live,scheduled');

  useEffect(() => {
    setLoading(true);
    matchAPI.list(tab === 'finished' ? 'finished' : 'live,scheduled,halftime')
      .then(({ matches: all }) => {
        if (tab === 'live') setMatches((all || []).filter(m => m.status === 'live'));
        else if (tab === 'finished') setMatches(all || []);
        else setMatches(all || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  const groups = groupByComp(matches);

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
          <span className={styles.logoTag}>🏏 IPL 2026</span>
        </div>
        <div className={styles.userRow}>
          <span className={styles.userPts}>⭐ {user?.total_points?.toLocaleString() || 0} pts</span>
          <div className={`avatar avatar-${user?.avatar_color || 'teal'}`} style={{ width: 32, height: 32 }}>
            {user?.avatar_initials || '??'}
          </div>
          {user?.is_admin && (
            <Link to="/admin" className={styles.adminLink}>⚙ Admin</Link>
          )}
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── Hero Banner ─────────────────────────────────────── */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>🏏 TATA IPL 2026</div>
            <h1 className={styles.heroTitle}>The Ultimate Cricket<br />Fan Experience</h1>
            <p className={styles.heroSub}>Predict • React • Win • Live</p>
          </div>
          <div className={styles.heroDecor}>
            <span className={styles.heroEmoji}>🏟</span>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          {[
            { key: 'live,scheduled', label: '📅 All Matches' },
            { key: 'live',           label: '🔴 Live Now'    },
            { key: 'finished',       label: '✅ Results'     },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Match List ──────────────────────────────────────── */}
        {loading ? (
          <div className={styles.loading}>
            <span className={styles.loadingSpinner} />
            Loading matches…
          </div>
        ) : !matches.length ? (
          <div className={styles.empty}>No matches found</div>
        ) : (
          Object.entries(groups).map(([comp, compMatches]) => (
            <div key={comp} className={styles.compGroup}>
              <div className={styles.compHeader}>
                <span className={styles.compIcon}>{isCricket(comp) ? '🏏' : '⚽'}</span>
                <span className={styles.compName}>{comp}</span>
                <span className={styles.compCount}>{compMatches.length} matches</span>
              </div>

              <div className={styles.grid}>
                {compMatches.map((m) => {
                  const cricket = isCricket(m.competition);
                  const statusInfo = STATUS_BADGE[m.status] || { label: m.status, cls: 'badge-blue' };

                  return (
                    <Link key={m.id} to={`/match/${m.id}`} className={`${styles.matchCard} ${m.status === 'live' ? styles.matchCardLive : ''}`}>

                      {/* Status row */}
                      <div className={styles.matchTop}>
                        <span className={`badge ${statusInfo.cls}`}>
                          {m.status === 'live' && <span className={styles.liveDot} />}
                          {statusInfo.label}
                        </span>
                        {m.status === 'live' && cricket && (
                          <span className={styles.oversBadge}>
                            {Math.floor((m.match_minute || 0) / 6)}.{(m.match_minute || 0) % 6} ov
                          </span>
                        )}
                        {m.fan_count > 0 && (
                          <span className={styles.viewers}>
                            👁 {parseInt(m.fan_count).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Teams + Score */}
                      <div className={styles.teams}>
                        {/* Home */}
                        <div className={styles.teamBlock}>
                          <div className={`${styles.teamBadge} ${styles[`team_${m.home_color}`]}`}>
                            {m.home_code}
                          </div>
                          <span className={styles.teamName}>{m.home_team_name}</span>
                          {cricket && m.status !== 'scheduled' && (
                            <span className={styles.cricScore}>{m.home_score}/{m.home_wickets ?? '?'}</span>
                          )}
                        </div>

                        {/* Score / VS */}
                        <div className={styles.scoreBlock}>
                          {m.status === 'scheduled' ? (
                            <div className={styles.scheduleInfo}>
                              <div className={styles.kickoffDate}>{formatDate(m.scheduled_at)}</div>
                              <div className={styles.kickoffTime}>{formatTime(m.scheduled_at)}</div>
                              <div className={styles.vsLabel}>VS</div>
                            </div>
                          ) : cricket ? (
                            <div className={styles.cricVs}>
                              <span className={styles.cricBall}>🏏</span>
                            </div>
                          ) : (
                            <span className={styles.scoreText}>{m.home_score} – {m.away_score}</span>
                          )}
                        </div>

                        {/* Away */}
                        <div className={`${styles.teamBlock} ${styles.teamRight}`}>
                          <div className={`${styles.teamBadge} ${styles[`team_${m.away_color}`]}`}>
                            {m.away_code}
                          </div>
                          <span className={styles.teamName}>{m.away_team_name}</span>
                          {cricket && m.status !== 'scheduled' && m.away_score > 0 && (
                            <span className={styles.cricScore}>{m.away_score}/{m.away_wickets ?? '?'}</span>
                          )}
                        </div>
                      </div>

                      {/* Venue */}
                      {m.venue && (
                        <div className={styles.venue}>📍 {m.venue.split(',').slice(-2).join(',').trim()}</div>
                      )}

                      {/* CTA */}
                      <div className={styles.cta}>
                        {m.status === 'live' ? '🔴 Join live →' : m.status === 'finished' ? 'View scorecard →' : 'Set reminder →'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
