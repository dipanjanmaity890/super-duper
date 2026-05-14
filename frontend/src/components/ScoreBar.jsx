import { useMatch } from '../context/MatchContext';
import styles from './ScoreBar.module.css';

// Detect if match is cricket
const isCricket = (comp = '') => /ipl|cricket|t20|odi|test/i.test(comp);

// Balls to overs display: e.g. 72 balls → "12.0 ov"
const ballsToOvers = (balls) => {
  if (!balls) return '0.0';
  return `${Math.floor(balls / 6)}.${balls % 6}`;
};

// Cricket urgency: last 5 overs, last 2 overs
const getCricketUrgency = (status, balls, target, chasing) => {
  if (status !== 'live') return null;
  const overs = balls / 6;
  if (overs >= 18)  return 'critical';   // last 2 overs
  if (overs >= 15)  return 'high';       // last 5 overs
  if (chasing && target && target - chasing <= 20) return 'medium'; // close chase
  return null;
};

const URGENCY_LABELS = {
  critical: { label: '⚡ DEATH OVERS',    cls: 'urgencyCritical' },
  high:     { label: '🔥 FINAL STRETCH',  cls: 'urgencyHigh'     },
  medium:   { label: '🎯 NAIL BITING',    cls: 'urgencyMedium'   },
};

export default function ScoreBar() {
  const { match, viewerCount } = useMatch();
  if (!match) return null;

  const cricket  = isCricket(match.competition || '');
  const isLive   = match.status === 'live';
  const scoreDiff = (match.home_score || 0) - (match.away_score || 0);
  const balls     = match.match_minute || 0; // we store balls in match_minute for cricket

  const urgency = cricket
    ? getCricketUrgency(match.status, balls, match.home_score, match.away_score)
    : (() => {
        const min = match.match_minute || 0;
        if (min >= 85) return 'critical';
        if (min >= 75) return 'high';
        if (min >= 60 && Math.abs(scoreDiff) <= 1) return 'medium';
        return null;
      })();

  const urgencyMeta = urgency ? URGENCY_LABELS[urgency] : null;

  // Status label
  const statusLabel = (() => {
    if (match.status === 'finished')  return cricket ? 'Match Over' : 'FT';
    if (match.status === 'halftime')  return cricket ? 'Inn Break'  : 'HT';
    if (match.status === 'scheduled') return 'Pre-match';
    if (match.status === 'live') {
      return cricket ? `${ballsToOvers(balls)} ov` : `${match.match_minute}'`;
    }
    return match.status;
  })();

  // Progress bar: cricket = out of 120 balls (T20), football = 90 min
  const progressPct = cricket
    ? Math.min((balls / 120) * 100, 100)
    : Math.min(((match.match_minute || 0) / 90) * 100, 100);

  return (
    <div className={`${styles.bar} ${urgency ? styles[`bar_${urgency}`] : ''}`}>

      {/* ── Urgency Banner ─────────────────────────────────────────── */}
      {urgencyMeta && (
        <div className={`${styles.urgencyBanner} ${styles[urgencyMeta.cls]}`}>
          <span className={styles.urgencyLabel}>{urgencyMeta.label}</span>
          <span className={styles.urgencyMin}>
            {cricket ? `${ballsToOvers(balls)} overs bowled` : `${match.match_minute}' played`}
          </span>
        </div>
      )}

      {/* ── Competition line ───────────────────────────────────────── */}
      <div className={styles.competition}>
        <span>{cricket ? '🏏' : '⚽'} {match.competition}</span>
        {match.venue && <span className={styles.venue}>· {match.venue.split(',')[0]}</span>}
        <span className={styles.viewers}>👁 {viewerCount.toLocaleString()} watching</span>
      </div>

      {/* ── Score Row ─────────────────────────────────────────────── */}
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
          {cricket ? (
            <div className={styles.cricScoreWrap}>
              <div className={`${styles.cricScore} ${urgency === 'critical' ? styles.scoreCritical : ''}`}>
                <span className={`${styles.scoreNum} ${scoreDiff > 0 ? styles.scoreWinning : ''}`}>
                  {match.home_score}
                  <span className={styles.wickets}>/{match.home_wickets ?? '?'}</span>
                </span>
                <span className={styles.scoreSep}>vs</span>
                <span className={`${styles.scoreNum} ${scoreDiff < 0 ? styles.scoreWinning : ''}`}>
                  {match.away_score > 0 ? (
                    <>{match.away_score}<span className={styles.wickets}>/{match.away_wickets ?? '?'}</span></>
                  ) : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className={`${styles.score} ${urgency === 'critical' ? styles.scoreCritical : ''}`}>
              <span className={`${styles.scoreNum} ${scoreDiff > 0 ? styles.scoreWinning : ''}`}>{match.home_score}</span>
              <span className={styles.scoreSep}>—</span>
              <span className={`${styles.scoreNum} ${scoreDiff < 0 ? styles.scoreWinning : ''}`}>{match.away_score}</span>
            </div>
          )}
          <div className={styles.statusRow}>
            {isLive && <span className={`${styles.liveDot} ${urgency === 'critical' ? styles.liveDotFast : ''}`} />}
            <span className={isLive ? styles.liveLabel : styles.statusLabel}>{statusLabel}</span>
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

      {/* ── Progress bar ──────────────────────────────────────────── */}
      {isLive && (
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${urgency ? styles[`progressFill_${urgency}`] : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
