import { useState, useCallback, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import { crowdPulseAPI } from '../services/api';
import styles from './FanChant.module.css';

const CHANT_MESSAGES = [
  { min: 1,  msg: 'Keep going!',          emoji: '📣' },
  { min: 5,  msg: 'Getting loud!',        emoji: '🔊' },
  { min: 10, msg: 'The crowd is buzzing!',emoji: '⚡' },
  { min: 20, msg: 'ELECTRIC atmosphere!', emoji: '🔥' },
  { min: 35, msg: 'Ultra Fan mode 🔥',    emoji: '🏆' },
];

function getMessage(taps) {
  let result = CHANT_MESSAGES[0];
  for (const m of CHANT_MESSAGES) {
    if (taps >= m.min) result = m;
  }
  return result;
}

// Fires floating emoji at the tap position using the global keyframe
function spawnFloat(emoji, x, y) {
  const el = document.createElement('div');
  el.textContent = emoji;
  el.style.cssText = [
    'position:fixed',
    `left:${x - 14}px`,
    `top:${y - 14}px`,
    'font-size:26px',
    'pointer-events:none',
    'z-index:9999',
    'animation:emojiFloat 1.1s ease-out forwards',
    'user-select:none',
  ].join(';');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

export default function FanChant() {
  const { match, crowdPulse } = useMatch();
  const [tapCount,   setTapCount]   = useState(0);
  const [pressing,   setPressing]   = useState(false);
  const [myTeamSide, setMyTeamSide] = useState('home');
  const btnRef = useRef(null);

  if (!match || match.status !== 'live') return null;

  const totalFans   = ((crowdPulse?.homeIntensity || 62) + (crowdPulse?.awayIntensity || 54)) * 95;
  const globalCount = Math.round(totalFans + tapCount * 4);
  const { msg, emoji } = getMessage(tapCount);

  const chant = useCallback(async (e) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      // Spray 3 emojis in slightly different spots
      ['📣', '🔥', '⚡'][Math.floor(Math.random() * 3)];
      spawnFloat('📣', cx + (Math.random() - 0.5) * 60, cy);
      if (tapCount % 3 === 0) spawnFloat('🔥', cx + (Math.random() - 0.5) * 80, cy + 10);
      if (tapCount % 5 === 0) spawnFloat('🏆', cx, cy + 5);
    }
    setPressing(true);
    setTapCount(c => c + 1);
    setTimeout(() => setPressing(false), 400);
    try { await crowdPulseAPI.tap(match.id, 'excited', myTeamSide); } catch { /* silent */ }
  }, [match, myTeamSide, tapCount]);

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.count}>
          <span className={styles.countNum}>{globalCount.toLocaleString()}</span>
          <span className={styles.countLabel}>fans chanting</span>
        </div>
        <div className={styles.sides}>
          <button
            className={`${styles.sideBtn} ${myTeamSide === 'home' ? styles.sideBtnActive : ''}`}
            onClick={() => setMyTeamSide('home')}
            style={myTeamSide === 'home' ? { borderColor: 'var(--teal)', color: 'var(--teal-text)' } : {}}
          >
            {match.home_code}
          </button>
          <button
            className={`${styles.sideBtn} ${myTeamSide === 'away' ? styles.sideBtnActive : ''}`}
            onClick={() => setMyTeamSide('away')}
            style={myTeamSide === 'away' ? { borderColor: 'var(--coral)', color: 'var(--coral-text)' } : {}}
          >
            {match.away_code}
          </button>
        </div>
      </div>

      {/* Big chant button */}
      <button
        ref={btnRef}
        className={`${styles.chantBtn} ${pressing ? styles.chantBtnPressed : ''}`}
        onPointerDown={chant}
      >
        <span className={styles.chantIcon}>{emoji}</span>
        <span className={styles.chantText}>TAP TO CHANT</span>
        {tapCount > 0 && (
          <span className={styles.chantCount}>+{tapCount}</span>
        )}
      </button>

      {/* Status message */}
      <div className={styles.statusRow}>
        {tapCount > 0
          ? <span className={styles.statusMsg}>{msg}</span>
          : <span className={styles.statusHint}>Join the crowd — tap the button!</span>
        }
      </div>

      {/* Mini bar showing home vs away chant split */}
      <div className={styles.splitBar}>
        <div
          className={styles.splitHome}
          style={{ width: `${crowdPulse?.homeIntensity || 60}%` }}
        />
        <div
          className={styles.splitAway}
          style={{ width: `${crowdPulse?.awayIntensity || 40}%` }}
        />
      </div>
      <div className={styles.splitLabels}>
        <span style={{ color: 'var(--teal-text)' }}>{match.home_code} {crowdPulse?.homeIntensity || 60}%</span>
        <span style={{ color: 'var(--coral-text)' }}>{crowdPulse?.awayIntensity || 40}% {match.away_code}</span>
      </div>
    </div>
  );
}
