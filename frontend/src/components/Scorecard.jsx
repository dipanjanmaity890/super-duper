import { useEffect, useState, useCallback } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './Scorecard.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

function BallDot({ ball }) {
  const cls = ball === 'W' ? styles.ballW
    : ball === '6' ? styles.ball6
    : ball === '4' ? styles.ball4
    : ball === '0' ? styles.ball0
    : styles.ballNormal;
  return <span className={`${styles.ball} ${cls}`}>{ball}</span>;
}

export default function Scorecard() {
  const { match } = useMatch();
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeInning, setActiveInning] = useState(0);

  const cricId = match?.metadata?.cric_id;

  const fetchScorecard = useCallback(async () => {
    if (!cricId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/cricket/scorecard/${cricId}`);
      const data = await res.json();
      if (data.data) setScorecard(data.data);
      else setError(data.message || 'No scorecard data');
    } catch {
      setError('Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  }, [cricId]);

  useEffect(() => {
    fetchScorecard();
    // Refresh every 30s when live
    if (match?.status === 'live') {
      const t = setInterval(fetchScorecard, 30_000);
      return () => clearInterval(t);
    }
  }, [fetchScorecard, match?.status]);

  if (!cricId) return (
    <div className={styles.noData}>
      <span>🏏</span>
      <p>Live scorecard available when match starts</p>
    </div>
  );

  if (loading && !scorecard) return (
    <div className={styles.loading}>
      <span className={styles.spinner} />Loading scorecard…
    </div>
  );

  if (error) return <div className={styles.error}>{error}</div>;
  if (!scorecard) return null;

  const innings = scorecard.scorecard || [];
  if (!innings.length) return (
    <div className={styles.noData}><span>🏏</span><p>Scorecard not available yet</p></div>
  );

  const inning = innings[activeInning] || innings[0];
  const batting = inning.batting || [];
  const bowling = inning.bowling || [];
  const score   = scorecard.score?.[activeInning] || {};

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>📋 Ball-by-Ball Scorecard</span>
        <button className={styles.refreshBtn} onClick={fetchScorecard} title="Refresh">↻</button>
      </div>

      {/* Inning tabs */}
      {innings.length > 1 && (
        <div className={styles.inningTabs}>
          {innings.map((inn, i) => (
            <button
              key={i}
              className={`${styles.inningTab} ${activeInning === i ? styles.inningTabActive : ''}`}
              onClick={() => setActiveInning(i)}
            >
              {inn.inning?.replace(' Inning 1','').replace(' Inning 2','')}
              {scorecard.score?.[i] && (
                <span className={styles.inningScore}>
                  {' '}{scorecard.score[i].r}/{scorecard.score[i].w} ({scorecard.score[i].o}ov)
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Score summary */}
      <div className={styles.scoreSummary}>
        <span className={styles.inningName}>{inning.inning}</span>
        <span className={styles.totalScore}>
          {score.r ?? '—'}/{score.w ?? '—'}
          <span className={styles.overs}> ({score.o ?? '—'} ov)</span>
        </span>
      </div>

      {/* Last 6 balls */}
      {inning.lastSixBalls?.length > 0 && (
        <div className={styles.lastBalls}>
          <span className={styles.lastBallsLabel}>Last 6 balls:</span>
          {inning.lastSixBalls.map((b, i) => <BallDot key={i} ball={String(b)} />)}
        </div>
      )}

      {/* Batting table */}
      <div className={styles.tableSection}>
        <div className={styles.tableTitle}>🏏 Batting</div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHeader}`}>
            <span className={styles.colBatsman}>Batter</span>
            <span className={styles.colDismissal}>Dismissal</span>
            <span className={styles.colNum}>R</span>
            <span className={styles.colNum}>B</span>
            <span className={styles.colNum}>4s</span>
            <span className={styles.colNum}>6s</span>
            <span className={styles.colNum}>SR</span>
          </div>
          {batting.map((b, i) => {
            const isOut = b['dismissal-text'] && b['dismissal-text'] !== '-';
            const notOut = b.b && !isOut;
            return (
              <div key={i} className={`${styles.row} ${isOut ? styles.rowOut : styles.rowNotOut}`}>
                <span className={styles.colBatsman}>
                  {b.batsman}
                  {notOut && <span className={styles.notOut}> *</span>}
                </span>
                <span className={styles.colDismissal}>{isOut ? b['dismissal-text'] : (b.b ? 'batting' : 'yet to bat')}</span>
                <span className={`${styles.colNum} ${styles.runs}`}>{b.r ?? '-'}</span>
                <span className={styles.colNum}>{b.b ?? '-'}</span>
                <span className={styles.colNum}>{b['4s'] ?? '-'}</span>
                <span className={`${styles.colNum} ${styles.sixes}`}>{b['6s'] ?? '-'}</span>
                <span className={styles.colNum}>{b.sr ?? '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bowling table */}
      {bowling.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.tableTitle}>🎳 Bowling</div>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.rowHeader}`}>
              <span className={styles.colBowler}>Bowler</span>
              <span className={styles.colNum}>O</span>
              <span className={styles.colNum}>M</span>
              <span className={styles.colNum}>R</span>
              <span className={`${styles.colNum} ${styles.wickets}`}>W</span>
              <span className={styles.colNum}>Eco</span>
            </div>
            {bowling.map((b, i) => (
              <div key={i} className={styles.row}>
                <span className={styles.colBowler}>{b.bowler}</span>
                <span className={styles.colNum}>{b.o ?? '-'}</span>
                <span className={styles.colNum}>{b.m ?? '-'}</span>
                <span className={styles.colNum}>{b.r ?? '-'}</span>
                <span className={`${styles.colNum} ${styles.wickets}`}>{b.w ?? '-'}</span>
                <span className={styles.colNum}>{b.eco ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
