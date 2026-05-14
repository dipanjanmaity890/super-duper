import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './PointsTable.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f'; // IPL 2026

const TEAM_COLORS = {
  'Mumbai Indians': 'blue', 'Chennai Super Kings': 'amber',
  'Royal Challengers Bengaluru': 'coral', 'Kolkata Knight Riders': 'purple',
  'Delhi Capitals': 'blue', 'Punjab Kings': 'coral',
  'Rajasthan Royals': 'purple', 'Sunrisers Hyderabad': 'amber',
  'Lucknow Super Giants': 'teal', 'Gujarat Titans': 'teal',
};
const TEAM_SHORT = {
  'Mumbai Indians': 'MI', 'Chennai Super Kings': 'CSK',
  'Royal Challengers Bengaluru': 'RCB', 'Kolkata Knight Riders': 'KKR',
  'Delhi Capitals': 'DC', 'Punjab Kings': 'PBKS',
  'Rajasthan Royals': 'RR', 'Sunrisers Hyderabad': 'SRH',
  'Lucknow Super Giants': 'LSG', 'Gujarat Titans': 'GT',
};

export default function PointsTable() {
  const { user, logout } = useAuth();
  const [table, setTable]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/cricket/points-table`)
      .then(r => r.json())
      .then(d => {
        if (d.table) setTable(d.table);
        else setError(d.error || 'Could not load points table');
      })
      .catch(() => setError('Failed to fetch points table'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
          <span className={styles.logoTag}>🏏 IPL 2026</span>
        </div>
        <div className={styles.userRow}>
          <Link to="/" className={styles.backLink}>← Matches</Link>
          <div className={`avatar avatar-${user?.avatar_color || 'teal'}`} style={{ width: 28, height: 28 }}>
            {user?.avatar_initials}
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <h1>🏆 IPL 2026 Points Table</h1>
          <p>Top 4 qualify for playoffs</p>
        </div>

        {loading ? (
          <div className={styles.loading}><span className={styles.spinner} /> Loading…</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.tableWrap}>
            {/* Header */}
            <div className={`${styles.row} ${styles.rowHeader}`}>
              <span className={styles.colPos}>#</span>
              <span className={styles.colTeam}>Team</span>
              <span className={styles.colNum}>P</span>
              <span className={styles.colNum}>W</span>
              <span className={styles.colNum}>L</span>
              <span className={styles.colNum}>NRR</span>
              <span className={`${styles.colNum} ${styles.colPts}`}>Pts</span>
            </div>

            {table.map((t, i) => {
              const color = TEAM_COLORS[t.teamName] || 'teal';
              const short = TEAM_SHORT[t.teamName] || t.teamName.slice(0, 3).toUpperCase();
              const isPlayoff = i < 4;
              return (
                <div key={i} className={`${styles.row} ${isPlayoff ? styles.rowPlayoff : ''}`}>
                  <span className={`${styles.colPos} ${isPlayoff ? styles.posPlayoff : ''}`}>{i + 1}</span>
                  <span className={styles.colTeam}>
                    <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>{short}</span>
                    <span className={styles.teamName}>{t.teamName}</span>
                    {isPlayoff && <span className={styles.playoffTag}>Playoff ✓</span>}
                  </span>
                  <span className={styles.colNum}>{t.matchesPlayed ?? '-'}</span>
                  <span className={`${styles.colNum} ${styles.wins}`}>{t.win ?? '-'}</span>
                  <span className={`${styles.colNum} ${styles.loss}`}>{t.loss ?? '-'}</span>
                  <span className={styles.colNum}>{t.nrr ?? '-'}</span>
                  <span className={`${styles.colNum} ${styles.colPts} ${styles.pts}`}>{t.points ?? '-'}</span>
                </div>
              );
            })}

            <div className={styles.note}>
              <span className={styles.noteDot} /> Top 4 teams qualify for the playoffs
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
