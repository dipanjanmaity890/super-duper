import { useState, useEffect } from 'react';
import { useMatch } from '../context/MatchContext';
import { crowdPulseAPI } from '../services/api';
import styles from './CrowdPulse.module.css';

const EMOTIONS = [
  { key: 'tense',       emoji: '😬', label: 'Tense'      },
  { key: 'excited',     emoji: '🔥', label: 'Excited'    },
  { key: 'anxious',     emoji: '😰', label: 'Anxious'    },
  { key: 'frustrated',  emoji: '😤', label: 'Frustrated' },
];

const EMOTION_LABELS = { tense: '😬 Tense', excited: '🔥 Excited', anxious: '😰 Anxious', frustrated: '😤 Frustrated' };

export default function CrowdPulse() {
  const { match, crowdPulse } = useMatch();
  const [myEmotion,  setMyEmotion]  = useState(null);
  const [myTeamSide, setMyTeamSide] = useState('home');
  const [fired,      setFired]      = useState(null);

  if (!match) return null;

  const pulse = crowdPulse || { homeIntensity: 62, awayIntensity: 54, homeDominantEmotion: 'excited', awayDominantEmotion: 'tense' };

  const tap = async (emotion) => {
    if (fired === emotion) return;
    setMyEmotion(emotion);
    setFired(emotion);
    try { await crowdPulseAPI.tap(match.id, emotion, myTeamSide); } catch { /* silent */ }
    setTimeout(() => setFired(null), 800);
  };

  const matchPct = myEmotion
    ? (myTeamSide === 'home' ? pulse.homeIntensity : pulse.awayIntensity)
    : null;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.icon}>💓</span>
        <span className={styles.title}>CROWD PULSE</span>
        <span className={styles.live}>LIVE</span>
      </div>

      {/* Intensity bars */}
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.teamLabel} style={{ color: 'var(--teal-text)' }}>{match.home_code}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFillHome} style={{ width: `${pulse.homeIntensity}%` }} />
          </div>
          <span className={styles.barPct}>{pulse.homeIntensity}%</span>
          <span className={styles.dominantEmotion}>{EMOTION_LABELS[pulse.homeDominantEmotion] || '🔥 Excited'}</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.teamLabel} style={{ color: 'var(--coral-text)' }}>{match.away_code}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFillAway} style={{ width: `${pulse.awayIntensity}%` }} />
          </div>
          <span className={styles.barPct}>{pulse.awayIntensity}%</span>
          <span className={styles.dominantEmotion}>{EMOTION_LABELS[pulse.awayDominantEmotion] || '😬 Tense'}</span>
        </div>
      </div>

      {/* Team allegiance toggle */}
      <div className={styles.allegiance}>
        <span className={styles.allegianceLabel}>Supporting:</span>
        <button
          className={`${styles.allegianceBtn} ${myTeamSide === 'home' ? styles.allegianceActive : ''}`}
          style={myTeamSide === 'home' ? { borderColor: 'var(--teal)', color: 'var(--teal-text)' } : {}}
          onClick={() => setMyTeamSide('home')}
        >
          {match.home_code}
        </button>
        <button
          className={`${styles.allegianceBtn} ${myTeamSide === 'away' ? styles.allegianceActive : ''}`}
          style={myTeamSide === 'away' ? { borderColor: 'var(--coral)', color: 'var(--coral-text)' } : {}}
          onClick={() => setMyTeamSide('away')}
        >
          {match.away_code}
        </button>
      </div>

      {/* Emotion buttons */}
      <div className={styles.emotions}>
        {EMOTIONS.map(({ key, emoji, label }) => (
          <button
            key={key}
            className={`${styles.emotionBtn} ${myEmotion === key ? styles.emotionSelected : ''} ${fired === key ? styles.emotionFired : ''}`}
            onClick={() => tap(key)}
          >
            <span className={styles.emotionEmoji}>{emoji}</span>
            <span className={styles.emotionLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* Contextual match line */}
      {matchPct !== null && (
        <div className={styles.matchLine}>
          You match <strong>{matchPct}%</strong> of {myTeamSide === 'home' ? match.home_team_name : match.away_team_name} fans right now
        </div>
      )}
    </div>
  );
}
