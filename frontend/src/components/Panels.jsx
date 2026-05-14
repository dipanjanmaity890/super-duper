import { useState, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './Panels.module.css';

// ─── Live Stats ───────────────────────────────────────────────────────────────
export function LiveStats() {
  const { stats, match } = useMatch();

  if (!stats?.length || !match) return null;

  const home = stats.find((s) => s.team_id === match.home_team_id) || {};
  const away = stats.find((s) => s.team_id === match.away_team_id) || {};

  const rows = [
    { label: 'Possession', h: parseFloat(home.possession) || 50, a: parseFloat(away.possession) || 50, isPercent: true },
    { label: 'Shots',       h: home.shots || 0,              a: away.shots || 0              },
    { label: 'On Target',   h: home.shots_on_target || 0,    a: away.shots_on_target || 0    },
    { label: 'Passes',      h: home.passes || 0,             a: away.passes || 0             },
    { label: 'Corners',     h: home.corners || 0,            a: away.corners || 0            },
    { label: 'Fouls',       h: home.fouls || 0,              a: away.fouls || 0              },
    { label: 'Yellow',      h: home.yellow_cards || 0,       a: away.yellow_cards || 0       },
    { label: 'xG',          h: parseFloat(home.xg) || 0,     a: parseFloat(away.xg) || 0, isDecimal: true },
  ];

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 12 }}>
        📈 Live match stats
      </div>
      <div className={styles.statsHeader}>
        <span style={{ color: 'var(--teal-text)', fontWeight: 600, fontSize: 12 }}>{match.home_code}</span>
        <span />
        <span style={{ color: 'var(--coral-text)', fontWeight: 600, fontSize: 12 }}>{match.away_code}</span>
      </div>

      {rows.map(({ label, h, a, isPercent, isDecimal }) => {
        const total = h + a || 1;
        const hPct  = (h / total) * 100;
        const aPct  = (a / total) * 100;
        const fmt   = (v) => isPercent ? `${Math.round(v)}%` : isDecimal ? v.toFixed(2) : String(v);
        return (
          <div key={label} className={styles.statRow}>
            <span className={styles.statNum}>{fmt(h)}</span>
            <div className={styles.statBars}>
              <div className={styles.statTrack}>
                <div className={styles.statFillHome} style={{ width: `${hPct}%` }} />
              </div>
              <span className={styles.statLabel}>{label}</span>
              <div className={styles.statTrack}>
                <div className={styles.statFillAway} style={{ width: `${aPct}%` }} />
              </div>
            </div>
            <span className={styles.statNumRight}>{fmt(a)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Momentum Bar ─────────────────────────────────────────────────────────────
export function MomentumBar() {
  const { stats, match } = useMatch();
  if (!stats?.length || !match) return null;

  const home = stats.find((s) => s.team_id === match.home_team_id) || {};
  const hmom = parseFloat(home.momentum) || 50;
  const amom = 100 - hmom;

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 8 }}>
        ⚡ Momentum
      </div>
      <div className={styles.momBar}>
        <div className={styles.momFillHome} style={{ width: `${hmom}%` }} />
        <div className={styles.momFillAway} style={{ width: `${amom}%` }} />
      </div>
      <div className={styles.momLabels}>
        <span style={{ color: 'var(--teal-text)' }}>{match.home_code} {Math.round(hmom)}%</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Possession + pressing</span>
        <span style={{ color: 'var(--coral-text)' }}>{Math.round(amom)}% {match.away_code}</span>
      </div>
    </div>
  );
}

// ─── Fan Feed ─────────────────────────────────────────────────────────────────
export function FanFeed() {
  const { feed, postFeed } = useMatch();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await postFeed(text.trim());
      setText('');
    } finally {
      setPosting(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const typeColors = {
    prediction_win: 'amber',
    achievement:    'purple',
    hot_take:       'coral',
    comment:        'blue',
    reaction:       'teal',
  };

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 12 }}>
        💬 Fan feed — {feed.length} posts
      </div>

      <div className={styles.feedInput}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          onKeyDown={handleKey}
          placeholder="React, predict, or comment…"
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '9px 14px', fontSize: 13 }}
          onClick={submit}
          disabled={!text.trim() || posting}
        >
          Post
        </button>
      </div>

      <div className={styles.feedList}>
        {feed.map((post) => (
          <div key={post.id} className={`${styles.feedItem} fade-in`}>
            <div className={`avatar avatar-${post.avatar_color || 'teal'}`}
              style={{ width: 30, height: 30 }}>
              {post.avatar_initials || '??'}
            </div>
            <div className={styles.feedBody}>
              <div className={styles.feedMeta}>
                <span className={styles.feedName}>{post.username}</span>
                {post.user_rank && (
                  <span className="badge badge-amber" style={{ fontSize: 10, padding: '1px 6px' }}>
                    #{post.user_rank}
                  </span>
                )}
                {post.post_type !== 'comment' && (
                  <span className={`badge badge-${typeColors[post.post_type] || 'blue'}`}
                    style={{ fontSize: 10, padding: '1px 6px' }}>
                    {post.post_type.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className={styles.feedText}>{post.content}</div>
              <div className={styles.feedTime}>
                {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {post.points_earned > 0 && (
                  <span style={{ color: 'var(--amber-text)', marginLeft: 6 }}>+{post.points_earned} pts</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {!feed.length && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No posts yet — be the first to react!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const { leaderboard, myMatchPts, myEntry } = useMatch();

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 12 }}>
        🏆 Match rankings
      </div>

      {myEntry && (
        <div className={styles.myPoints}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Your points</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-text)' }}>
              {myMatchPts} pts
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Your rank</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-text)' }}>
              {myEntry.rank ? `#${myEntry.rank}` : '—'}
            </div>
          </div>
        </div>
      )}

      <div className={styles.lbList}>
        {leaderboard.map((row, i) => (
          <div key={row.username} className={styles.lbRow}>
            <span className={styles.lbRank}>
              {i < 3 ? RANK_MEDALS[i] : `#${i + 1}`}
            </span>
            <div className={`avatar avatar-${row.avatar_color || 'teal'}`}
              style={{ width: 28, height: 28 }}>
              {row.avatar_initials || '??'}
            </div>
            <span className={styles.lbName}>{row.username}</span>
            <span className={styles.lbPts}>{row.points} pts</span>
          </div>
        ))}
        {!leaderboard.length && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No rankings yet — participate to appear here
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Earn pts: vote (+10) · react (+5) · correct prediction (+50–80) · streak bonus (+25)
      </div>
    </div>
  );
}
