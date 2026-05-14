import { useMatch } from '../context/MatchContext';
import styles from './EventTimeline.module.css';

const EVENT_META = {
  goal:            { icon: '⚽', color: 'teal'   },
  own_goal:        { icon: '🙈', color: 'coral'  },
  penalty_scored:  { icon: '⚽', color: 'teal'   },
  penalty_awarded: { icon: '🟡', color: 'coral'  },
  penalty_missed:  { icon: '❌', color: 'amber'  },
  yellow_card:     { icon: '🟡', color: 'amber'  },
  red_card:        { icon: '🔴', color: 'coral'  },
  substitution:    { icon: '🔄', color: 'purple' },
  save:            { icon: '🧤', color: 'blue'   },
  var_check:       { icon: '📺', color: 'amber'  },
  corner:          { icon: '🚩', color: 'blue'   },
  injury:          { icon: '🩺', color: 'coral'  },
  halftime:        { icon: '⏸', color: 'purple' },
  fulltime:        { icon: '🏁', color: 'purple' },
  kickoff:         { icon: '🏟', color: 'teal'   },
};

const humanise = (type) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function EventTimeline() {
  const { events } = useMatch();

  return (
    <div className="card">
      <div className="label" style={{ marginBottom: 12 }}>
        📋 Match timeline
      </div>

      <div className={styles.list}>
        {events.length === 0 && (
          <div className={styles.empty}>No events yet</div>
        )}
        {events.map((ev) => {
          const meta = EVENT_META[ev.event_type] || { icon: '⚡', color: 'blue' };
          return (
            <div key={ev.id} className={`${styles.item} fade-in`}>
              <div className={styles.minute}>{ev.minute}'</div>
              <div className={`${styles.dot} ${styles[`dot_${meta.color}`]}`}>
                {meta.icon}
              </div>
              <div className={styles.content}>
                <div className={styles.type}>{humanise(ev.event_type)}</div>
                {ev.player_name && (
                  <div className={styles.player}>
                    {ev.team_code && <span className={styles.teamCode}>{ev.team_code}</span>}
                    {ev.player_name}
                    {ev.assist_name && <span className={styles.assist}> · assist: {ev.assist_name}</span>}
                  </div>
                )}
                {ev.description && !ev.player_name && (
                  <div className={styles.desc}>{ev.description}</div>
                )}
              </div>
              {ev.is_key_moment && (
                <span className={styles.keyBadge}>KEY</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
