import { useState, useCallback, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import { predAPI } from '../services/api';
import styles from './Widgets.module.css';

// ─── Floating emoji helper ─────────────────────────────────────────────────────
function spawnFloat(emoji, x, y) {
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = [
      'position:fixed',
      `left:${x + (Math.random() - 0.5) * 40 - 12}px`,
      `top:${y - 10}px`,
      'font-size:22px',
      'pointer-events:none',
      'z-index:9999',
      `animation:emojiFloat ${0.9 + Math.random() * 0.4}s ease-out ${i * 0.08}s forwards`,
      'user-select:none',
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
}

// ─── Poll Widget ───────────────────────────────────────────────────────────────
export function PollWidget() {
  const { activePoll, votePoll } = useMatch();
  const [voted,    setVoted]    = useState(false);
  const [selected, setSelected] = useState(null);
  const [pending,  setPending]  = useState(null);

  if (!activePoll) return null;

  const totalVotes = activePoll.options?.reduce((s, o) => s + (o.vote_count || 0), 0) || 1;

  const handleVote = async (opt, e) => {
    if (voted || activePoll.status !== 'active' || pending) return;
    setPending(opt.id);
    setSelected(opt.id);
    // Spawn floating pts label
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat('✅', rect.left + rect.width / 2, rect.top);
    try { await votePoll(opt.id); setVoted(true); }
    catch { setSelected(null); }
    finally { setPending(null); }
  };

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetIcon}>📊</span>
        <span className={styles.widgetTitle}>LIVE POLL</span>
        <span className={styles.livePill}>
          <span className={styles.liveDot} /> LIVE
        </span>
      </div>
      <div className={styles.question}>{activePoll.question}</div>

      <div className={styles.pollOptions}>
        {(activePoll.options || []).map((opt) => {
          const pct       = Math.round((opt.vote_count || 0) / totalVotes * 100);
          const isSelected = selected === opt.id;
          const isLeading  = voted && pct === Math.max(...(activePoll.options || []).map(o => Math.round((o.vote_count || 0) / totalVotes * 100)));

          return (
            <button
              key={opt.id}
              className={`${styles.pollOption} ${isSelected ? styles.pollSelected : ''} ${voted ? styles.pollVoted : ''} ${isLeading && voted ? styles.pollLeading : ''}`}
              onClick={(e) => handleVote(opt, e)}
              disabled={voted || !!pending}
            >
              {/* Animated fill bar */}
              <div
                className={`${styles.pollBar} ${isSelected ? styles.pollBarSelected : ''}`}
                style={{ width: voted ? `${pct}%` : '0%' }}
              />
              <div className={styles.pollRow}>
                <span className={styles.pollText}>{opt.option_text}</span>
                <span className={styles.pollPct}>
                  {voted ? `${pct}%` : pending === opt.id ? '…' : ''}
                </span>
              </div>
              {isLeading && voted && <span className={styles.leadingBadge}>🏆 Leading</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.pollMeta}>
        <span>{totalVotes.toLocaleString()} votes · updates live</span>
        {activePoll.points_reward && (
          <span className={styles.ptsTag}>+{activePoll.points_reward} pts</span>
        )}
      </div>

      {voted && (
        <div className={styles.votedConfirm}>
          ✓ Voted! Results are live — watch the bars move
        </div>
      )}
    </div>
  );
}

// ─── Prediction Widget ─────────────────────────────────────────────────────────
export function PredictionWidget() {
  const { activeEvent, match } = useMatch();
  const [choice,  setChoice]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const btnRef = useRef({});

  if (!activeEvent || activeEvent.event_type !== 'penalty_awarded') return null;

  const OPTIONS = [
    { value: 'scored', label: '⚽ Scores',        pts: 50, color: 'teal'  },
    { value: 'missed', label: '❌ Misses / Saved', pts: 80, color: 'coral' },
  ];

  const submit = async (value, e) => {
    if (done || loading) return;
    setChoice(value);
    setLoading(true);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat('🎯', rect.left + rect.width / 2, rect.top);
    try {
      await predAPI.submit({
        matchId:         match.id,
        matchEventId:    activeEvent.id,
        predictionType:  'penalty_outcome',
        predictionValue: value,
        pointsReward:    value === 'missed' ? 80 : 50,
      });
      setDone(true);
    } catch { setChoice(null); }
    finally { setLoading(false); }
  };

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetIcon}>🎯</span>
        <span className={styles.widgetTitle}>PREDICT & EARN</span>
        <span className={`${styles.livePill} ${styles.livePillAmber}`}>PENALTY!</span>
      </div>
      <div className={styles.question}>Will the penalty be scored?</div>

      <div className={styles.predOptions}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            ref={el => { btnRef.current[o.value] = el; }}
            className={`${styles.predBtn} ${styles[`predBtn_${o.color}`]} ${choice === o.value ? styles.predSelected : ''} ${done ? styles.predDone : ''}`}
            onClick={(e) => submit(o.value, e)}
            disabled={done || loading}
          >
            <span className={styles.predLabel}>{o.label}</span>
            <span className={styles.predPts}>+{o.pts} pts if correct</span>
          </button>
        ))}
      </div>

      {done && (
        <div className={styles.predConfirm}>
          🔒 Locked in! You'll earn points when the kick is taken.
        </div>
      )}
    </div>
  );
}

// ─── Reaction Bar ──────────────────────────────────────────────────────────────
const REACTIONS = [
  { type: 'fire',   emoji: '🔥', label: 'Fire'   },
  { type: 'shock',  emoji: '😱', label: 'Shock'  },
  { type: 'target', emoji: '🎯', label: 'Pin'    },
  { type: 'angry',  emoji: '😤', label: 'Angry'  },
  { type: 'chat',   emoji: '💬', label: 'Chat'   },
];

const fmt = (n) => {
  const num = parseInt(n || 0);
  return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num > 0 ? String(num) : '';
};

export function ReactionBar() {
  const { activeEvent, reactions, addReaction } = useMatch();
  const [fired,  setFired]  = useState({});
  const [counts, setCounts] = useState({});

  if (!activeEvent) return null;

  const liveCounts = { ...reactions[activeEvent.id], ...counts };
  const total = Object.values(liveCounts).reduce((s, c) => s + parseInt(c || 0), 0);

  const handleReact = async (type, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const emoji = REACTIONS.find(r => r.type === type)?.emoji || '⚡';
    spawnFloat(emoji, rect.left + rect.width / 2, rect.top);

    setFired(f => ({ ...f, [type]: true }));
    setCounts(c => ({ ...c, [type]: (parseInt(c[type] || liveCounts[type] || 0)) + 1 }));
    setTimeout(() => setFired(f => ({ ...f, [type]: false })), 500);

    await addReaction(activeEvent.id, type);
  };

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetIcon}>⚡</span>
        <span className={styles.widgetTitle}>REACT NOW</span>
        {total > 0 && (
          <span className={styles.totalReactions}>{total.toLocaleString()} reactions</span>
        )}
      </div>

      <div className={styles.momentLabel}>
        <span>{activeEvent.event_type === 'goal' ? '⚽' : activeEvent.event_type === 'red_card' ? '🔴' : '⚡'}</span>
        {activeEvent.player_name ? `${activeEvent.player_name} — ` : ''}{activeEvent.description || activeEvent.event_type.replace(/_/g, ' ')}
      </div>

      <div className={styles.reactionRow}>
        {REACTIONS.map(({ type, emoji, label }) => (
          <button
            key={type}
            className={`${styles.reactBtn} ${fired[type] ? styles.reactFired : ''}`}
            onClick={(e) => handleReact(type, e)}
          >
            <span className={styles.reactEmoji}>{emoji}</span>
            <span className={styles.reactLabel}>{label}</span>
            {fmt(liveCounts[type]) && (
              <span className={`${styles.reactCount} ${fired[type] ? styles.reactCountBump : ''}`}>
                {fmt(liveCounts[type])}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Moment Card ───────────────────────────────────────────────────────────────
const EVENT_STYLES = {
  goal:            { accent: 'teal',   emoji: '⚽', label: 'Goal!'           },
  penalty_scored:  { accent: 'teal',   emoji: '⚽', label: 'Penalty Scored!' },
  penalty_awarded: { accent: 'coral',  emoji: '🟡', label: 'Penalty Awarded' },
  penalty_missed:  { accent: 'amber',  emoji: '❌', label: 'Penalty Missed'  },
  yellow_card:     { accent: 'amber',  emoji: '🟡', label: 'Yellow Card'     },
  red_card:        { accent: 'coral',  emoji: '🔴', label: 'Red Card'        },
  save:            { accent: 'blue',   emoji: '🧤', label: 'Great Save!'     },
  substitution:    { accent: 'purple', emoji: '🔄', label: 'Substitution'    },
  var_check:       { accent: 'amber',  emoji: '📺', label: 'VAR Check'       },
  wicket:          { accent: 'coral',  emoji: '🏏', label: 'Wicket!'         },
  boundary_six:    { accent: 'teal',   emoji: '🏏', label: 'SIX!'            },
  milestone:       { accent: 'amber',  emoji: '⭐', label: 'Milestone!'      },
  halftime:        { accent: 'purple', emoji: '⏸', label: 'Half Time'       },
  fulltime:        { accent: 'purple', emoji: '🏁', label: 'Full Time'       },
  kickoff:         { accent: 'teal',   emoji: '🏟', label: 'Kick Off'        },
};

export function MomentCard() {
  const { activeEvent, match } = useMatch();

  if (!activeEvent) {
    return (
      <div className={`${styles.momentCard} ${styles.moment_teal}`}>
        <span className={styles.momentEmoji}>🏟</span>
        <div>
          <div className={styles.momentTitle}>Match is live — engage with every moment</div>
          <div className={styles.momentDesc}>Vote in polls, predict, and react as the action unfolds.</div>
        </div>
      </div>
    );
  }

  const style = EVENT_STYLES[activeEvent.event_type] || { accent: 'blue', emoji: '⚡', label: 'Key Moment' };
  const isGoalType = ['goal', 'penalty_scored', 'wicket', 'boundary_six'].includes(activeEvent.event_type);

  return (
    <div className={`${styles.momentCard} ${styles[`moment_${style.accent}`]} ${isGoalType ? styles.momentGoal : ''}`}>
      <span className={styles.momentEmoji}>{style.emoji}</span>
      <div className={styles.momentBody}>
        <div className={styles.momentTitle}>
          {style.label}
          {activeEvent.player_name && ` — ${activeEvent.player_name}`}
          <span className={styles.momentMinute}> {activeEvent.minute}'</span>
        </div>
        {activeEvent.description && (
          <div className={styles.momentDesc}>{activeEvent.description}</div>
        )}
        {activeEvent.assist_name && (
          <div className={styles.momentAssist}>⚡ Assist: {activeEvent.assist_name}</div>
        )}
      </div>
      {activeEvent.is_key_moment && <span className={styles.keyBadge}>KEY</span>}
    </div>
  );
}
