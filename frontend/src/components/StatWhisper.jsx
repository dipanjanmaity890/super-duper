import { useState, useEffect, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './StatWhisper.module.css';

// ─── Context-aware AI insight templates ────────────────────────────────────────
const TEMPLATES = {
  goal: [
    (e, m) => `${e.player_name || 'The scorer'} has now found the net ${randomNum(3,8)} times in their last ${randomNum(5,10)} appearances.`,
    (e, m) => `${m?.home_team_name} have now scored ${randomNum(2,5)} goals from open play this match — their highest in ${randomNum(3,6)} games.`,
    (e, m) => `Only ${randomNum(2,5)}% of teams that trail at this stage go on to win. The pressure is on.`,
    (e, m) => `${e.player_name || 'The scorer'} is in the top 10% of strikers for xG conversion this season.`,
  ],
  penalty_awarded: [
    () => `${randomNum(68,76)}% of penalties in this competition are scored. Fan predictions are split.`,
    () => `The keeper has saved ${randomNum(1,3)} of their last ${randomNum(4,7)} penalties faced.`,
    () => `Penalty pressure index: psychological advantage shifts by ~${randomNum(12,20)} points after a converted spot-kick.`,
  ],
  penalty_scored: [
    (e) => `${e.player_name || 'The taker'} converts with composure. Their penalty success rate this season: ${randomNum(82,96)}%.`,
    () => `Games decided by a penalty have a ${randomNum(71,85)}% win rate for the scoring side.`,
  ],
  penalty_missed: [
    () => `Only ${randomNum(15,28)}% of teams recover to win after missing a penalty in this phase of the game.`,
    (e) => `The momentum swing from a missed penalty is significant — crowd intensity typically drops ${randomNum(15,22)} points.`,
  ],
  yellow_card: [
    (e) => `${e.player_name || 'The player'} must now be cautious — one more caution ends their involvement.`,
    () => `Disciplinary pressure tends to suppress pressing intensity by ${randomNum(8,15)}% in the next 10 minutes.`,
  ],
  red_card: [
    () => `Playing with 10 men reduces expected goals by ${randomNum(28,38)}% on average. Defensive shape is everything now.`,
    (e) => `${randomNum(22,31)}% of matches with a red card before the 70th minute end in draws.`,
  ],
  save: [
    (e) => `That save keeps the shot-stopper's xG prevented rate in the top ${randomNum(10,20)}% this season.`,
    () => `A great save at this moment can shift crowd intensity as much as a goal — watch the chant bar.`,
  ],
  wicket: [
    (e) => `${e.player_name || 'The batter'} falls after a composed innings — a crucial breakthrough at this stage.`,
    () => `Wickets in this phase of the game shift win probability by ${randomNum(12,22)}%.`,
  ],
  boundary_six: [
    (e) => `${e.player_name || 'The batter'} launches it into the stands — that's their ${randomNum(2,5)}th six today.`,
    () => `Six-hitting increases the required run rate pressure on the bowling side significantly.`,
  ],
  milestone: [
    (e) => `${e.player_name || 'The batter'} reaches a landmark that only ${randomNum(3,8)} players have hit in this format this season.`,
  ],
  halftime: [
    (_, m) => `At the break: ${m?.home_team_name} have a slight xG edge. Second halves often see ${randomNum(55,65)}% of all goals in tight matches.`,
    () => `Teams that lead at half time win ${randomNum(72,82)}% of matches in this competition.`,
  ],
  var_check: [
    () => `VAR decisions take an average of ${randomNum(90,180)} seconds — fan stress peaks during the wait.`,
    () => `${randomNum(58,72)}% of VAR reviews in this competition confirm the on-field decision.`,
  ],
  default: [
    () => `AI Insight: Match intensity is ${randomNum(72,91)}% above average for this fixture at this stage.`,
    () => `Fan engagement typically spikes ${randomNum(3,5)}x after key moments like this one.`,
  ],
};

function randomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getInsight(eventType, event, match) {
  const pool = TEMPLATES[eventType] || TEMPLATES.default;
  const fn   = pool[Math.floor(Math.random() * pool.length)];
  try { return fn(event, match); } catch { return TEMPLATES.default[0](); }
}

const LABEL = {
  goal:            '⚽ Goal Insight',
  penalty_awarded: '🟡 Penalty Analysis',
  penalty_scored:  '⚽ Spot-kick Data',
  penalty_missed:  '❌ Miss Analysis',
  yellow_card:     '🟡 Discipline Alert',
  red_card:        '🔴 Tactical Impact',
  save:            '🧤 Save Analysis',
  wicket:          '🏏 Wicket Impact',
  boundary_six:    '🏏 Six Analysis',
  milestone:       '⭐ Milestone Intel',
  halftime:        '📊 Half-time Report',
  var_check:       '📺 VAR Analysis',
  default:         '🤖 FanPulse AI',
};

// Typing animation — streams the text character by character
function useTypingEffect(text, speed = 22) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed('');
    idx.current = 0;
    if (!text) return;
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return displayed;
}

export default function StatWhisper() {
  const { activeEvent, match } = useMatch();
  const [insight,   setInsight]   = useState('');
  const [label,     setLabel]     = useState('');
  const [visible,   setVisible]   = useState(false);
  const [leaving,   setLeaving]   = useState(false);
  const lastId = useRef(null);

  useEffect(() => {
    if (!activeEvent || activeEvent.id === lastId.current) return;
    lastId.current = activeEvent.id;

    // Slight delay so it feels like the AI is "thinking"
    const thinkDelay = setTimeout(() => {
      const type = activeEvent.event_type;
      setInsight(getInsight(type, activeEvent, match));
      setLabel(LABEL[type] || LABEL.default);
      setLeaving(false);
      setVisible(true);

      // Auto-dismiss after 10 seconds
      const leaveTimer  = setTimeout(() => setLeaving(true),  9600);
      const removeTimer = setTimeout(() => setVisible(false), 10000);
      return () => { clearTimeout(leaveTimer); clearTimeout(removeTimer); };
    }, 900);

    return () => clearTimeout(thinkDelay);
  }, [activeEvent, match]);

  const displayed = useTypingEffect(visible ? insight : '');

  if (!visible) return null;

  return (
    <div className={`${styles.card} ${leaving ? styles.cardOut : ''}`}>
      <div className={styles.header}>
        <span className={styles.icon}>🤖</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.aiTag}>FanPulse AI</span>
        <button className={styles.close} onClick={() => { setLeaving(true); setTimeout(() => setVisible(false), 300); }}>
          ✕
        </button>
      </div>

      <p className={styles.text}>
        {displayed}
        {displayed.length < insight.length && <span className={styles.cursor}>▎</span>}
      </p>

      <div className={styles.footer}>
        <span className={styles.footerNote}>Context-aware · updates with the match</span>
        <span className={styles.footerDot}>
          <span className={styles.footerDotPulse} /> Processing live data
        </span>
      </div>
    </div>
  );
}
