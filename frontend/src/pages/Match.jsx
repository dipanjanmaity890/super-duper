import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { MatchProvider, useMatch } from '../context/MatchContext';
import { useAuth } from '../context/AuthContext';

import ScoreBar         from '../components/ScoreBar';
import Scorecard        from '../components/Scorecard';
import LiveChat         from '../components/LiveChat';
import AICommentary     from '../components/AICommentary';
import Notification, { ToastStack } from '../components/Notification';
import { MomentCard, PollWidget, PredictionWidget, ReactionBar } from '../components/Widgets';
import { LiveStats, MomentumBar, FanFeed, Leaderboard }          from '../components/Panels';
import EventTimeline    from '../components/EventTimeline';
import CrowdPulse       from '../components/CrowdPulse';
import WinProbChart     from '../components/WinProbChart';
import FanChant         from '../components/FanChant';
import GoalCelebration  from '../components/GoalCelebration';
import StatWhisper      from '../components/StatWhisper';
import styles from './Match.module.css';

const TABS = [
  { key: 'engage',    label: '⚡ Engage'    },
  { key: 'scorecard', label: '🏏 Scorecard' },
  { key: 'chat',      label: '💬 Chat'      },
  { key: 'stats',     label: '📈 Stats'     },
  { key: 'feed',      label: '📝 Feed'      },
  { key: 'timeline',  label: '📋 Timeline'  },
  { key: 'rankings',  label: '🏆 Rankings'  },
];

function MatchContent() {
  const { match, notification, loading, myMatchPts, viewerCount } = useMatch();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('engage');

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
        Loading match…
      </div>
    );
  }
  if (!match) return <div className={styles.loading}>Match not found</div>;

  return (
    <div className={styles.page}>
      {/* Goal celebration overlay (full-screen) */}
      <GoalCelebration />

      {/* Legacy single notification */}
      <Notification message={notification} />

      {/* Stacking toast stack (for future granular events) */}
      <ToastStack />

      {/* Top nav */}
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Matches</Link>
        <div className={styles.logo}>
          Fan<span className={styles.logoAccent}>Pulse</span>
        </div>
        <div className={styles.userRow}>
          {/* Live viewer count */}
          {viewerCount > 1 && (
            <span className={styles.viewers}>👁 {viewerCount.toLocaleString()}</span>
          )}
          {/* My match points pill */}
          {myMatchPts > 0 && (
            <span className={styles.myPts}>⭐ {myMatchPts}</span>
          )}
          <div className={`avatar avatar-${user?.avatar_color || 'teal'}`} style={{ width: 28, height: 28 }}>
            {user?.avatar_initials}
          </div>
          <span className={styles.username}>{user?.username}</span>
          {user?.is_admin && (
            <Link to="/admin" className={styles.adminLink}>⚙ Admin</Link>
          )}
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={logout}>
            Out
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <ScoreBar />

        {/* Tabs */}
        <div className={styles.tabBar}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.tabBtn} ${tab === key ? styles.tabActive : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className={styles.content}>

          {tab === 'engage' && (
            <div className={styles.engageGrid}>
              <div className={styles.engageMain}>
                <AICommentary />
                <WinProbChart />
                <MomentCard />
                <StatWhisper />
                <div className={styles.engageRow}>
                  <PollWidget />
                  <PredictionWidget />
                </div>
                <ReactionBar />
                <FanChant />
                <CrowdPulse />
                <MomentumBar />
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div className={styles.singleCol}>
              <WinProbChart />
              <LiveStats />
              <MomentumBar />
            </div>
          )}

          {tab === 'feed' && (
            <div className={styles.singleCol}>
              <FanFeed />
            </div>
          )}

          {tab === 'scorecard' && (
            <div className={styles.singleCol}>
              <Scorecard />
            </div>
          )}

          {tab === 'chat' && (
            <div className={styles.singleCol}>
              <LiveChat />
            </div>
          )}

          {tab === 'timeline' && (
            <div className={styles.singleCol}>
              <EventTimeline />
            </div>
          )}

          {tab === 'rankings' && (
            <div className={styles.singleCol}>
              <Leaderboard />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function MatchPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/auth" replace />;
  return (
    <MatchProvider matchId={id}>
      <MatchContent />
    </MatchProvider>
  );
}
