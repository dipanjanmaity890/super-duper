import { useState, useEffect } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './GoalCelebration.module.css';

const CONFETTI_COLORS = [
  'var(--teal)', 'var(--teal-light)', 'var(--coral)', 'var(--amber-light)',
  'var(--purple-light)', '#fff', '#f0f2f8',
];

export default function GoalCelebration() {
  const { goalEvent } = useMatch();
  const [visible, setVisible]   = useState(false);
  const [current, setCurrent]   = useState(null);
  const [leaving, setLeaving]   = useState(false);

  useEffect(() => {
    if (!goalEvent) return;
    setCurrent(goalEvent);
    setVisible(true);
    setLeaving(false);

    const leaveTimer   = setTimeout(() => setLeaving(true), 3600);
    const removeTimer  = setTimeout(() => { setVisible(false); setLeaving(false); }, 4000);
    return () => { clearTimeout(leaveTimer); clearTimeout(removeTimer); };
  }, [goalEvent]);

  const dismiss = () => { setLeaving(true); setTimeout(() => setVisible(false), 350); };

  if (!visible || !current) return null;

  const isGoal = ['goal', 'penalty_scored'].includes(current.event_type);

  return (
    <div className={`${styles.overlay} ${leaving ? styles.overlayOut : ''}`} onClick={dismiss}>
      {/* Confetti */}
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className={styles.confetti}
          style={{
            left:            `${(i / 28) * 100}%`,
            background:      CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay:  `${(i % 8) * 0.08}s`,
            animationDuration:`${1.8 + (i % 5) * 0.25}s`,
            width:           `${6 + (i % 4) * 3}px`,
            height:          `${6 + (i % 3) * 3}px`,
            borderRadius:    i % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}

      {/* Card */}
      <div className={`${styles.card} ${leaving ? styles.cardOut : ''}`} onClick={e => e.stopPropagation()}>
        <div className={styles.goalEmoji}>{isGoal ? '⚽' : '🔴'}</div>

        <div className={styles.goalLabel}>
          {isGoal ? 'GOAL!' : current.event_type === 'red_card' ? 'RED CARD!' : 'KEY MOMENT!'}
        </div>

        {current.player_name && (
          <div className={styles.playerName}>{current.player_name}</div>
        )}
        {current.assist_name && (
          <div className={styles.assist}>⚡ assist: {current.assist_name}</div>
        )}
        {current.description && !current.player_name && (
          <div className={styles.desc}>{current.description}</div>
        )}

        <div className={styles.minuteBadge}>{current.minute}'</div>

        <div className={styles.dismiss}>tap anywhere to dismiss</div>
      </div>
    </div>
  );
}
