import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Profile.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BADGES = [
  { id: 'first_login',   icon: '🎉', label: 'First Login',       desc: 'Welcome to FanPulse!' },
  { id: 'predictor',     icon: '🎯', label: 'Sharp Predictor',   desc: '5+ correct predictions' },
  { id: 'hot_streak',    icon: '🔥', label: 'Hot Streak',        desc: '3 correct in a row' },
  { id: 'social',        icon: '💬', label: 'Social Fan',        desc: '10+ feed posts' },
  { id: 'ipl_fanatic',   icon: '🏏', label: 'IPL Fanatic',       desc: 'Watched 5+ IPL matches' },
  { id: 'top10',         icon: '🏆', label: 'Top 10 Finisher',   desc: 'Top 10 in a match' },
];

const TEAM_COLORS = {
  'MI': 'blue', 'CSK': 'amber', 'RCB': 'coral', 'KKR': 'purple',
  'DC': 'blue', 'PBKS': 'coral', 'RR': 'purple', 'SRH': 'amber',
  'LSG': 'teal', 'GT': 'teal',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setStats(d.user || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profile = stats || user;
  const totalPts = profile?.total_points || 0;
  const predAcc  = profile?.prediction_accuracy ?? null;
  const teamCode = profile?.favourite_team || 'FP';
  const color    = TEAM_COLORS[teamCode] || 'teal';

  // Derive earned badges from stats
  const earnedBadges = BADGES.filter(b => {
    if (b.id === 'first_login')  return true;
    if (b.id === 'predictor')    return (profile?.total_predictions || 0) >= 5;
    if (b.id === 'social')       return (profile?.total_posts || 0) >= 10;
    return false;
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
        </div>
        <div className={styles.headerNav}>
          <Link to="/" className={styles.navLink}>🏠 Matches</Link>
          <Link to="/points-table" className={styles.navLink}>🏆 Table</Link>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero profile card */}
        <div className={styles.heroCard}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <div className={`${styles.avatar} ${styles[`avatar_${color}`]}`}>
              {profile?.avatar_initials || profile?.username?.slice(0,2).toUpperCase() || '??'}
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.username}>{profile?.username || 'Fan'}</h1>
              <p className={styles.email}>{profile?.email}</p>
              {teamCode !== 'FP' && (
                <span className={`${styles.teamBadge} ${styles[`team_${color}`]}`}>
                  🏏 {teamCode} Fan
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalPts.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Points</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.gold}`}>
              {predAcc !== null ? `${Math.round(predAcc * 100)}%` : '—'}
            </div>
            <div className={styles.statLabel}>Prediction Accuracy</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{profile?.total_predictions || 0}</div>
            <div className={styles.statLabel}>Predictions Made</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.teal}`}>{earnedBadges.length}</div>
            <div className={styles.statLabel}>Badges Earned</div>
          </div>
        </div>

        {/* Badges */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🏅 Badges</h2>
          <div className={styles.badgesGrid}>
            {BADGES.map((b) => {
              const earned = earnedBadges.some(e => e.id === b.id);
              return (
                <div key={b.id} className={`${styles.badgeCard} ${!earned ? styles.badgeLocked : ''}`}>
                  <span className={styles.badgeIcon}>{b.icon}</span>
                  <span className={styles.badgeName}>{b.label}</span>
                  <span className={styles.badgeDesc}>{b.desc}</span>
                  {!earned && <div className={styles.lockOverlay}>🔒</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <Link to="/" className={styles.actionBtn}>
              <span>🏏</span> Watch Live Matches
            </Link>
            <Link to="/points-table" className={styles.actionBtn}>
              <span>🏆</span> IPL Points Table
            </Link>
            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={logout}>
              <span>👋</span> Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
