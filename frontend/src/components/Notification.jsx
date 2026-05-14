import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Notification.module.css';

const ICONS = {
  pts:     '⭐',
  correct: '🎯',
  streak:  '🔥',
  first:   '⚡',
  default: '✓',
};

function classify(msg) {
  if (!msg) return 'default';
  if (msg.includes('pts') || msg.includes('points')) return 'pts';
  if (msg.includes('correct') || msg.includes('Correct')) return 'correct';
  if (msg.includes('streak') || msg.includes('Streak')) return 'streak';
  if (msg.includes('first') || msg.includes('First')) return 'first';
  return 'default';
}

// ─── Single Toast ─────────────────────────────────────────────────────────────
function Toast({ id, message, onRemove }) {
  const [leaving, setLeaving] = useState(false);
  const type = classify(message);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2800);
    const t2 = setTimeout(() => onRemove(id), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [id, onRemove]);

  return (
    <div
      className={`${styles.toast} ${styles[`toast_${type}`]} ${leaving ? styles.toastOut : ''}`}
      onClick={() => { setLeaving(true); setTimeout(() => onRemove(id), 300); }}
    >
      <span className={styles.toastIcon}>{ICONS[type]}</span>
      <span className={styles.toastMsg}>{message}</span>
    </div>
  );
}

// ─── Toast Stack (standalone, used in Match.jsx) ──────────────────────────────
let globalAddToast = null;
export function addToast(msg) { if (globalAddToast) globalAddToast(msg); }

export function ToastStack() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const add = useCallback((msg) => {
    if (!msg) return;
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-3), { id, msg }]); // max 4 visible
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => { globalAddToast = add; return () => { globalAddToast = null; }; }, [add]);

  return (
    <div className={styles.stack}>
      {toasts.map(t => (
        <Toast key={t.id} id={t.id} message={t.msg} onRemove={remove} />
      ))}
    </div>
  );
}

// ─── Legacy single-message notification (prop-driven, used in MatchContext) ───
export default function Notification({ message }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [text, setText]       = useState('');

  useEffect(() => {
    if (!message) return;
    setText(message);
    setLeaving(false);
    setVisible(true);
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [message]);

  if (!visible) return null;
  const type = classify(text);

  return (
    <div className={styles.stack} style={{ pointerEvents: 'none' }}>
      <div className={`${styles.toast} ${styles[`toast_${type}`]} ${leaving ? styles.toastOut : ''}`}>
        <span className={styles.toastIcon}>{ICONS[type]}</span>
        <span className={styles.toastMsg}>{text}</span>
      </div>
    </div>
  );
}
