import { useState, useEffect, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import { useAuth } from '../context/AuthContext';
import styles from './LiveChat.module.css';

// Quick-reaction emojis for one-tap sends
const QUICK = ['🔥', '💥', '🏏', '😱', '👏', '🎯', '😤', '🥳'];

// Format timestamp → "2:45 PM"
const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function LiveChat() {
  const { match, socket } = useMatch();
  const { user }          = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const matchId = match?.id;

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !matchId) return;

    // Load history when joining
    socket.on('chat_history', (msgs) => {
      setMessages(msgs);
    });

    // New incoming message
    socket.on('chat_message', (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg]); // keep last 100
    });

    // Online count
    socket.on('viewer_count', ({ count }) => setOnlineCount(count));

    return () => {
      socket.off('chat_history');
      socket.off('chat_message');
      socket.off('viewer_count');
    };
  }, [socket, matchId]);

  // ── Auto-scroll to bottom on new message ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const send = (msg) => {
    const content = (msg || text).trim();
    if (!content || !socket) return;
    socket.emit('chat_send', { matchId, text: content });
    setText('');
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!match) return null;

  return (
    <div className={styles.wrap}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>💬 Live Chat</span>
          <span className={styles.online}>
            <span className={styles.onlineDot} />
            {onlineCount || 1} watching
          </span>
        </div>
        <div className={styles.matchBadge}>
          {match.home_code} vs {match.away_code}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className={styles.messages}>
        {!messages.length && (
          <div className={styles.emptyChat}>
            <span className={styles.emptyChatEmoji}>💬</span>
            <p>No messages yet</p>
            <p className={styles.emptyChatSub}>Be the first to react!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === user?.id;
          return (
            <div key={msg.id} className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''}`}>
              {!isMe && (
                <div className={`avatar avatar-teal ${styles.avatar}`} style={{ width: 26, height: 26, fontSize: 10 }}>
                  {msg.username?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`}>
                {!isMe && <div className={styles.bubbleName}>{msg.username}</div>}
                <div className={styles.bubbleText}>{msg.text}</div>
                <div className={styles.bubbleTime}>{fmtTime(msg.ts)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick emojis ────────────────────────────────────────────── */}
      <div className={styles.quickBar}>
        {QUICK.map((e) => (
          <button key={e} className={styles.quickBtn} onClick={() => send(e)}>{e}</button>
        ))}
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          onKeyDown={handleKey}
          placeholder="Type a message…"
        />
        <button
          className={styles.sendBtn}
          onClick={() => send()}
          disabled={!text.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
