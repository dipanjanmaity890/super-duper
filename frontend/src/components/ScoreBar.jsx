import { useMatch } from '../context/MatchContext';
import styles from './ScoreBar.module.css';

const statusLabel = (status, minute) => {
  if (status === 'finished')  return 'FT';
  if (status === 'halftime')  return 'HT';
  if (status === 'scheduled') return 'Pre-match';
  if (status === 'live')      return `${minute}'`;
  return status;
};

// Urgency tier based on match state
const getUrgencyTier = (status, minute, scoreDiff) => {
  if (status !== 'live') return null;
  if (minute >= 85)  return 'critical';   // last 5 mins or injury time
  if (minute >= 75)  return 'high';       // final quarter, especially if close
  if (minute >= 60 && Math.abs(scoreDiff) <= 1) return 'medium'; // tight game
  return null;
};

const URGENCY_LABELS = {
  critical: { label: '⏱ CLOSING TIME', cls: 'urgencyCritical' },
  high:     { label: '🔥 FINAL PUSH',   cls: 'urgencyHigh'     },
  medium:   { label: '⚡ TENSE',        cls: 'urgencyMedium'   },
};

export default function ScoreBar() {
  const { match, viewerCount } = useMatch();
  if (!match) return null;

  const isLive   = match.status === 'live';
  const scoreDiff = (match.home_score || 0) - (match.away_score || 0);
  const urgency   = getUrgencyTier(match.status, match.match_minute, scoreDiff);
  const urgencyMeta = urgency ? URGENCY_LABELS[urgency] : null;

  return (
    <div className={`${styles.bar} ${urgency ? styles[`bar_${urgency}`] : ''}`}>
      {/* Urgency banner */}
      {urgencyMeta && (
        <div className={`${styles.urgencyBanner} ${styles[urgencyMeta.cls]}`}>
          <span className={styles.urgencyLabel}>{urgencyMeta.label}</span>
          <span className={styles.urgencyMin}>{match.match_minute}' played</span>
        </div>
      )}

      <div className={styles.competition}>
        {match.competition} · {match.venue}
        <span className={styles.viewers}>👁 {viewerCount.toLocaleString()} watching</span>
      </div>

      <div className={styles.main}>
        {/* Home */}
        <div className={styles.team}>
          <div className={`${styles.badge} ${styles[`badge_${match.home_color || 'teal'}`]}`}>
            {match.home_code}
          </div>
          <span className={styles.teamName}>{match.home_team_name}</span>
        </div>

        {/* Score */}
        <div className={styles.center}>
          <div className={`${styles.score} ${urgency === 'critical' ? styles.scoreCritical : ''}`}>
            <span className={`${styles.scoreNum} ${scoreDiff > 0 ? styles.scoreWinning : ''}`}>
              {match.home_score}
            </span>
            <span className={styles.scoreSep}>—</span>
            <span className={`${styles.scoreNum} ${scoreDiff < 0 ? styles.scoreWinning : ''}`}>
              {match.away_score}
            </span>
          </div>
          <div className={styles.statusRow}>
            {isLive && <span className={`${styles.liveDot} ${urgency === 'critical' ? styles.liveDotFast : ''}`} />}
            <span className={isLive ? styles.liveLabel : styles.statusLabel}>
              {statusLabel(match.status, match.match_minute)}
            </span>
          </div>
        </div>

        {/* Away */}
        <div className={`${styles.team} ${styles.teamRight}`}>
          <span className={styles.teamName}>{match.away_team_name}</span>
          <div className={`${styles.badge} ${styles[`badge_${match.away_color || 'coral'}`]}`}>
            {match.away_code}
          </div>
        </div>
      </div>

      {/* Progress bar — match time */}
      {isLive && (
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${urgency ? styles[`progressFill_${urgency}`] : ''}`}
            style={{ width: `${Math.min((match.match_minute / 90) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
