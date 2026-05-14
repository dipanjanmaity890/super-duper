import { useMemo } from 'react';
import { useMatch } from '../context/MatchContext';
import styles from './WinProbChart.module.css';

// ─── SVG dimensions ────────────────────────────────────────────────────────────
const W = 420, H = 130;
const PAD = { left: 38, right: 14, top: 14, bottom: 26 };
const PW  = W - PAD.left - PAD.right;
const PH  = H - PAD.top  - PAD.bottom;

const toX = (min)  => PAD.left + (Math.min(Math.max(min, 0), 90) / 90) * PW;
const toY = (prob) => PAD.top  + (1 - Math.min(Math.max(prob, 0), 100) / 100) * PH;

// ─── Win probability formula ────────────────────────────────────────────────
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const calcProb = (homeScore, awayScore, homeXg, awayXg, minute) => {
  const t       = Math.min(minute, 90) / 90;
  const score   = (homeScore - awayScore) * (0.4 + t * 1.2);
  const xg      = (homeXg   - awayXg)   * (0.5 - t * 0.4);
  return Math.round(sigmoid(score + xg) * 100);
};

// ─── Build timeline from match events ─────────────────────────────────────────
const buildTimeline = (events, stats, match) => {
  if (!match) return [{ minute: 0, prob: 50 }];

  const home = stats?.find(s => s.team_id === match.home_team_id) || {};
  const away = stats?.find(s => s.team_id === match.away_team_id) || {};

  // Build from chronological events
  const sorted = [...(events || [])].reverse();
  let hg = 0, ag = 0;
  const pts = [{ minute: 0, prob: 50 }];

  for (const ev of sorted) {
    if (ev.event_type === 'goal' || ev.event_type === 'penalty_scored') {
      const isHome = ev.team_id === match.home_team_id;
      if (isHome) hg++; else ag++;
      const min = ev.minute || 1;
      const hxg = parseFloat(home.xg) || hg * 0.55;
      const axg = parseFloat(away.xg) || ag * 0.55;
      pts.push({ minute: min, prob: calcProb(hg, ag, hxg, axg, min) });
    }
    if (ev.event_type === 'halftime')  pts.push({ minute: 45,  prob: pts[pts.length - 1].prob });
    if (ev.event_type === 'fulltime')  pts.push({ minute: 90,  prob: pts[pts.length - 1].prob });
  }

  // Current
  const currentMin = match.match_minute || 0;
  const currentProb = calcProb(
    match.home_score || 0, match.away_score || 0,
    parseFloat(home.xg) || 0, parseFloat(away.xg) || 0,
    currentMin
  );
  if (currentMin > 0) pts.push({ minute: currentMin, prob: currentProb });

  // Dedupe & sort
  const unique = [...new Map(pts.map(p => [p.minute, p])).values()].sort((a, b) => a.minute - b.minute);
  return unique.length > 1 ? unique : [{ minute: 0, prob: 50 }, { minute: currentMin || 1, prob: currentProb }];
};

// ─── SVG path helpers ──────────────────────────────────────────────────────────
const toSVGPoints = (timeline) => timeline.map(p => ({ x: toX(p.minute), y: toY(p.prob), prob: p.prob }));

const linePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

const areaPath = (pts, baseY) => {
  if (!pts.length) return '';
  const line  = linePath(pts);
  const first = pts[0];
  const last  = pts[pts.length - 1];
  return `M${first.x.toFixed(1)},${baseY} ${line} L${last.x.toFixed(1)},${baseY} Z`;
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function WinProbChart() {
  const { match, stats, events } = useMatch();

  const timeline = useMemo(() => buildTimeline(events, stats, match), [events, stats, match]);
  const pts      = useMemo(() => toSVGPoints(timeline), [timeline]);

  if (!match) return null;

  const midY    = toY(50);
  const current = pts[pts.length - 1];
  const curProb = current?.prob ?? 50;
  const isHomeWinning = curProb > 50;
  const lineColor = isHomeWinning ? 'var(--teal)' : 'var(--coral)';

  // Minute markers (0, 15, 30, 45, 60, 75, 90)
  const minuteMarks = [0, 15, 30, 45, 60, 75, 90];

  return (
    <div className={styles.card}>
      {/* Header row */}
      <div className={styles.header}>
        <span className={styles.title}>📊 Win Probability</span>
        <div className={styles.probRow}>
          <span className={styles.homeTeam} style={{ color: 'var(--teal-text)' }}>{match.home_code}</span>
          <span className={styles.probNum} style={{ color: isHomeWinning ? 'var(--teal-text)' : 'var(--coral-text)' }}>
            {curProb}%
          </span>
          <span className={styles.awayTeam} style={{ color: 'var(--coral-text)' }}>{match.away_code}</span>
          <span className={styles.probNum} style={{ color: !isHomeWinning ? 'var(--coral-text)' : 'var(--teal-text)' }}>
            {100 - curProb}%
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Teal gradient fill (home winning) */}
          <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--teal)"  stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--teal)"  stopOpacity="0.04" />
          </linearGradient>
          {/* Coral gradient fill (away winning) */}
          <linearGradient id="coralFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--coral)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Grid lines (minute marks) */}
        {minuteMarks.map(m => (
          <line key={m}
            x1={toX(m)} y1={PAD.top} x2={toX(m)} y2={PAD.top + PH}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,3"
          />
        ))}

        {/* 50% reference line */}
        <line
          x1={PAD.left} y1={midY} x2={PAD.left + PW} y2={midY}
          stroke="var(--border-hi)" strokeWidth="1" strokeDasharray="4,4"
        />
        <text x={PAD.left - 4} y={midY + 4} textAnchor="end"
          fontSize="9" fill="var(--text-muted)">50</text>

        {/* Y-axis labels */}
        {[100, 75, 25, 0].map(v => (
          <text key={v} x={PAD.left - 4} y={toY(v) + 4} textAnchor="end"
            fontSize="9" fill="var(--text-muted)">{v}</text>
        ))}

        {/* Area fill */}
        {pts.length > 1 && (<>
          {/* Teal fill above 50% when winning */}
          <path d={areaPath(pts, midY)} fill="url(#tealFill)" />
          {/* Coral fill below 50% when losing */}
          <path d={areaPath(pts.map(p => ({ ...p, y: Math.max(p.y, midY) })), PAD.top + PH)}
            fill="url(#coralFill)" />
        </>)}

        {/* Main probability line */}
        {pts.length > 1 && (
          <path d={linePath(pts)} fill="none" stroke={lineColor} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Goal markers */}
        {(events || []).filter(e => e.event_type === 'goal' || e.event_type === 'penalty_scored').map((e) => (
          <g key={e.id}>
            <line x1={toX(e.minute)} y1={PAD.top} x2={toX(e.minute)} y2={PAD.top + PH}
              stroke={e.team_id === match.home_team_id ? 'var(--teal)' : 'var(--coral)'}
              strokeWidth="1.5" opacity="0.6" />
            <circle cx={toX(e.minute)} cy={toY(50)} r="3"
              fill={e.team_id === match.home_team_id ? 'var(--teal)' : 'var(--coral)'} />
          </g>
        ))}

        {/* Current value dot */}
        {current && (
          <circle cx={current.x} cy={current.y} r="4.5"
            fill={lineColor} stroke="var(--bg-card)" strokeWidth="2" />
        )}

        {/* X-axis minute labels */}
        {minuteMarks.map(m => (
          <text key={m} x={toX(m)} y={H - 4} textAnchor="middle"
            fontSize="9" fill="var(--text-muted)">{m === 0 ? '' : `${m}'`}</text>
        ))}

        {/* Current minute label */}
        {match.match_minute > 0 && match.status === 'live' && (
          <text x={toX(match.match_minute)} y={PAD.top - 3} textAnchor="middle"
            fontSize="9" fill="var(--teal-text)">{match.match_minute}'</text>
        )}
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem} style={{ color: 'var(--teal-text)' }}>
          <span className={styles.legendDot} style={{ background: 'var(--teal)' }} />
          {match.home_team_name} win
        </span>
        <span className={styles.legendItem} style={{ color: 'var(--text-muted)' }}>
          · computed from xG + score ·
        </span>
        <span className={styles.legendItem} style={{ color: 'var(--coral-text)' }}>
          {match.away_team_name} win
          <span className={styles.legendDot} style={{ background: 'var(--coral)', marginLeft: 5 }} />
        </span>
      </div>
    </div>
  );
}
