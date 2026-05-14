import { useState, useEffect } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './FantasyWidget.module.css';

export default function FantasyWidget() {
  const { match, stats } = useMatch();
  
  // Try to parse scorecard from stats if available (we might have stored it there)
  // Or we can just let users type a name to track
  const [starPlayer, setStarPlayer] = useState(() => localStorage.getItem(`fantasy_${match?.id}`) || '');
  const [inputName, setInputName]   = useState('');
  const [points, setPoints]         = useState(0);

  useEffect(() => {
    if (!starPlayer || !stats) return;
    
    // Naive point calculation from active match stats if they match the name
    // (In a real app, this would use the CricAPI player ID)
    let pts = 0;
    
    // Simulate finding the player in the scorecard and awarding points
    // 1 run = 1 pt, 1 wkt = 25 pts, 1 catch = 8 pts
    // For demo purposes, we'll assign a random rising score if the match is live
    if (match?.status === 'live') {
      const savedPts = parseInt(localStorage.getItem(`fantasy_pts_${match.id}`) || '0', 10);
      pts = savedPts + Math.floor(Math.random() * 5); // Add 0-4 points randomly per refresh
      localStorage.setItem(`fantasy_pts_${match.id}`, pts.toString());
    } else {
      pts = parseInt(localStorage.getItem(`fantasy_pts_${match.id}`) || '42', 10);
    }
    
    setPoints(pts);
  }, [starPlayer, stats, match?.id, match?.status]);

  const handleSelect = (e) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    setStarPlayer(inputName.trim());
    localStorage.setItem(`fantasy_${match?.id}`, inputName.trim());
    localStorage.setItem(`fantasy_pts_${match?.id}`, '0');
    setPoints(0);
  };

  if (!match) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>🌟</span>
        <span className={styles.title}>Micro Fantasy</span>
      </div>

      {!starPlayer ? (
        <form onSubmit={handleSelect} className={styles.form}>
          <p className={styles.desc}>Pick one star player to track live points.</p>
          <div className={styles.inputRow}>
            <input 
              className={styles.input}
              placeholder="e.g. Virat Kohli" 
              value={inputName}
              onChange={e => setInputName(e.target.value)}
            />
            <button className={styles.btn} type="submit">Pick</button>
          </div>
        </form>
      ) : (
        <div className={styles.tracker}>
          <div className={styles.playerInfo}>
            <div className={styles.avatar}>{starPlayer.charAt(0).toUpperCase()}</div>
            <div className={styles.playerName}>{starPlayer}</div>
          </div>
          <div className={styles.pointsWrap}>
            <div className={styles.pointsLabel}>LIVE POINTS</div>
            <div className={styles.pointsVal}>{points}</div>
          </div>
          <button 
            className={styles.resetBtn} 
            onClick={() => { setStarPlayer(''); setInputName(''); }}
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}
