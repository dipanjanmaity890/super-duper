import { useState, useEffect, useCallback } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './WinProbChart.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function WinProbChart() {
  const { match } = useMatch();
  const [probData, setProbData] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const fetchWinProb = useCallback(async () => {
    if (!match?.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('fp_token');
      const res = await fetch(`${API_BASE}/api/ai/winprob/${match.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.homeWinPct !== undefined) {
        setProbData(data);
      }
    } catch (err) {
      console.error('Failed to fetch win prob', err);
    } finally {
      setLoading(false);
    }
  }, [match?.id]);

  useEffect(() => {
    fetchWinProb();
    if (match?.status === 'live') {
      const t = setInterval(fetchWinProb, 120_000); // refresh every 2 mins
      return () => clearInterval(t);
    }
  }, [fetchWinProb, match?.status]);

  if (!match) return null;

  const homePct = probData?.homeWinPct || 50;
  const awayPct = probData?.awayWinPct || 50;
  const reason  = probData?.reason || 'Awaiting Gemini analysis...';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.icon}>⚖️</span>
          <span className={styles.title}>AI Win Predictor</span>
        </div>
        {loading && <span className={styles.spinner} />}
      </div>

      <div className={styles.teams}>
        <div className={styles.teamHome}>
          <span className={styles.teamCode}>{match.home_code}</span>
          <span className={styles.teamPct}>{homePct}%</span>
        </div>
        <div className={styles.teamAway}>
          <span className={styles.teamPct}>{awayPct}%</span>
          <span className={styles.teamCode}>{match.away_code}</span>
        </div>
      </div>

      <div className={styles.barWrap}>
        <div 
          className={styles.barHome} 
          style={{ width: `${homePct}%` }} 
        />
        <div 
          className={styles.barAway} 
          style={{ width: `${awayPct}%` }} 
        />
        <div className={styles.marker} style={{ left: `${homePct}%` }}>
          <div className={styles.markerDiamond} />
        </div>
      </div>

      <div className={styles.reasoning}>
        <span className={styles.geminiBadge}>✨ Gemini</span>
        <span className={styles.reasonText}>{reason}</span>
      </div>
    </div>
  );
}
