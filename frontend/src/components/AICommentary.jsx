import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import html2canvas from 'html2canvas';
import styles from './AICommentary.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AICommentary() {
  const { match } = useMatch();
  const [commentary, setCommentary] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [ts,         setTs]         = useState('');
  const [error,      setError]      = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const cardRef = useRef(null);

  // Web Speech API
  useEffect(() => {
    if (!voiceEnabled || !commentary) return;
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(commentary);
    utterance.rate = 1.1;
    utterance.pitch = 1.2; // Slightly energetic
    
    // Find a good voice
    const voices = window.speechSynthesis.getVoices();
    const engVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-IN') || v.name.includes('Google'));
    if (engVoice) utterance.voice = engVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [commentary, voiceEnabled]);

  const fetchCommentary = useCallback(async () => {
    if (!match?.id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('fp_token');
      const res   = await fetch(`${API_BASE}/api/ai/commentary/${match.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (data.commentary) {
        setCommentary(data.commentary);
        setTs(new Date(data.generatedAt).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit',
        }));
      } else {
        setError(data.error || 'Commentary unavailable');
      }
    } catch {
      setError('Could not load AI commentary');
    } finally {
      setLoading(false);
    }
  }, [match?.id]);

  // Fetch on mount + auto-refresh every 90s during live matches
  useEffect(() => {
    fetchCommentary();
    if (match?.status === 'live') {
      const t = setInterval(fetchCommentary, 90_000);
      return () => clearInterval(t);
    }
  }, [fetchCommentary, match?.status]);

  // Share as Image
  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0e17', scale: 2,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'fanpulse-ai-commentary.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'FanPulse AI Match Analyst',
          text: `Check out this AI match analysis from FanPulse! ${match.home_code} vs ${match.away_code} 🏏`,
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.download = 'fanpulse-ai-commentary.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (!match) return null;

  return (
    <div className={styles.card} ref={cardRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.aiIcon}>🤖</span>
          <div>
            <div className={styles.title}>AI Analyst</div>
            <div className={styles.subtitle}>Powered by Gemini 2.0 Flash</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.actionBtn} onClick={handleShare} title="Share as Image">
            📸
          </button>
          <button
            className={`${styles.actionBtn} ${voiceEnabled ? styles.actionBtnActive : ''}`}
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) window.speechSynthesis?.cancel();
            }}
            title="Listen Live Voice Commentary"
          >
            {voiceEnabled ? '🎧 On' : '🔇 Off'}
          </button>
          <button
            className={styles.refreshBtn}
            onClick={fetchCommentary}
            disabled={loading}
            title="Refresh commentary"
          >
            {loading ? <span className={styles.spinner} /> : '↻'}
          </button>
        </div>
      </div>

      {/* Commentary body */}
      <div className={styles.body}>
        {loading && !commentary ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            <span>Analysing match…</span>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : commentary ? (
          <>
            <div className={styles.commentaryText}>
              <span className={styles.quoteMark}>"</span>
              {commentary}
              <span className={styles.quoteMark}>"</span>
            </div>
            {ts && (
              <div className={styles.timestamp}>
                Updated at {ts}
                {match.status === 'live' && <span className={styles.autoRefresh}> · auto-refreshes every 90s</span>}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Match context footer */}
      <div className={styles.footer}>
        <span className={styles.footerMatch}>
          {match.home_code} vs {match.away_code}
        </span>
        <span className={`${styles.footerStatus} ${match.status === 'live' ? styles.live : ''}`}>
          {match.status === 'live' ? '🔴 LIVE' : match.status}
        </span>
      </div>
    </div>
  );
}
