import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Lobby.module.css';


const STATUS_BADGE = {
  live:      { label: 'LIVE',       cls: 'badge-red'    },
  scheduled: { label: 'Upcoming',   cls: 'badge-blue'   },
  halftime:  { label: 'Half Time',  cls: 'badge-amber'  },
  finished:  { label: 'Full Time',  cls: 'badge-purple' },
};

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('live,scheduled');

  useEffect(() => {
    setLoading(true);
    matchAPI.list(tab)
      .then(({ matches }) => setMatches(matches || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
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
        <h1 className={styles.heading}>Live &amp; Upcoming Matches</h1>

        <div className={styles.tabs}>
          {[
            { key: 'live',              label: '🔴 Live now' },
            { key: 'live,scheduled',    label: '📅 All'      },
            { key: 'finished',          label: '✅ Finished'  },
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

        {loading ? (
          <div className={styles.empty}>Loading matches…</div>
        ) : !matches.length ? (
          <div className={styles.empty}>No matches found</div>
        ) : (
          <div className={styles.grid}>
            {matches.map((m) => {
              const statusInfo = STATUS_BADGE[m.status] || { label: m.status, cls: 'badge-blue' };
              return (
                <Link key={m.id} to={`/match/${m.id}`} className={styles.matchCard}>
                  <div className={styles.matchTop}>
                    <span className={`badge ${statusInfo.cls}`}>
                      {m.status === 'live' && <span className={styles.liveDot} />}
                      {statusInfo.label}
                      {m.status === 'live' && ` ${m.match_minute}'`}
                    </span>
                    <span className={styles.comp}>{m.competition}</span>
                    <span className={styles.viewers}>
                      {m.fan_count > 0 ? `👁 ${parseInt(m.fan_count).toLocaleString()} fans` : ''}
                    </span>
                  </div>

                  <div className={styles.teams}>
                    <div className={styles.teamBlock}>
                      <div className={`${styles.teamBadge} ${styles[`team_${m.home_color}`]}`}>
                        {m.home_code}
                      </div>
                      <span className={styles.teamName}>{m.home_team_name}</span>
                    </div>

                    <div className={styles.scoreBlock}>
                      {m.status !== 'scheduled' ? (
                        <span className={styles.scoreText}>{m.home_score} – {m.away_score}</span>
                      ) : (
                        <span className={styles.kickoffTime}>
                          {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className={`${styles.teamBlock} ${styles.teamRight}`}>
                      <div className={`${styles.teamBadge} ${styles[`team_${m.away_color}`]}`}>
                        {m.away_code}
                      </div>
                      <span className={styles.teamName}>{m.away_team_name}</span>
                    </div>
                  </div>

                  {m.venue && (
                    <div className={styles.venue}>📍 {m.venue}</div>
                  )}

                  <div className={styles.cta}>
                    {m.status === 'live' ? 'Join live →' : 'View match →'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
