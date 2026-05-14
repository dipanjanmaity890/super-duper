import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { matchAPI, pollAPI, reactionAPI, feedAPI, leaderboardAPI, crowdPulseAPI } from '../services/api';

const MatchContext = createContext(null);

export const MatchProvider = ({ matchId, children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const [match,       setMatch]       = useState(null);
  const [stats,       setStats]       = useState([]);
  const [events,      setEvents]      = useState([]);
  const [activePoll,  setActivePoll]  = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [reactions,   setReactions]   = useState({});
  const [feed,        setFeed]        = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEntry,     setMyEntry]     = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [myMatchPts,  setMyMatchPts]  = useState(0);
  const [notification,setNotification]= useState(null);
  const [loading,     setLoading]     = useState(true);
  const [crowdPulse,  setCrowdPulse]  = useState(null);
  const [goalEvent,   setGoalEvent]   = useState(null);   // triggers celebration overlay


  // ─── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    Promise.all([
      matchAPI.get(matchId),
      feedAPI.get(matchId),
      leaderboardAPI.match(matchId),
      crowdPulseAPI.get(matchId),
    ]).then(([matchData, feedData, lbData, pulseData]) => {
      setMatch(matchData.match);
      setStats(matchData.stats   || []);
      setEvents(matchData.events || []);
      setActivePoll(matchData.activePoll);
      setViewerCount(matchData.viewerCount || 0);
      setFeed(feedData.posts         || []);
      setLeaderboard(lbData.leaderboard || []);
      setMyEntry(lbData.myEntry);
      if (lbData.myEntry) setMyMatchPts(lbData.myEntry.points || 0);
      setCrowdPulse(pulseData);

      const keyEvent = matchData.events?.find((e) => e.is_key_moment);
      if (keyEvent) setActiveEvent(keyEvent);
    }).finally(() => setLoading(false));
  }, [matchId]);

  // ─── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId || !user) return;

    const token = localStorage.getItem('fp_token');
    const SOCKET_URL = import.meta.env.VITE_API_URL || '';
    const sock  = io(SOCKET_URL, { auth: { token }, transports: ['websocket','polling'] });
    socketRef.current = sock;

    sock.on('connect', () => { sock.emit('join_match', matchId); });

    sock.on('viewer_count',      ({ count }) => setViewerCount(count));
    sock.on('score_update',      (data)  => setMatch((m) => m ? { ...m, home_score: data.home_score, away_score: data.away_score } : m));
    sock.on('match_event',       (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 30));
      if (event.is_key_moment) setActiveEvent(event);
      // Trigger celebration overlay for exciting events
      const celebrationTypes = ['goal','penalty_scored','wicket','boundary_six','milestone'];
      if (celebrationTypes.includes(event.event_type)) {
        setGoalEvent({ ...event, _ts: Date.now() }); // new object reference every time
      }
      if (event.event_type === 'fulltime') setMatch((m) => m ? { ...m, status: 'finished' } : m);
      if (event.event_type === 'halftime') setMatch((m) => m ? { ...m, status: 'halftime' } : m);
    });
    sock.on('new_poll',          (poll)            => setActivePoll(poll));
    sock.on('poll_update',       ({ pollId, options }) =>
      setActivePoll((p) => (p?.id === pollId ? { ...p, options } : p)));
    sock.on('reaction_update',   ({ eventId, counts }) =>
      setReactions((prev) => ({ ...prev, [eventId]: counts })));
    sock.on('feed_post',         (post)            => setFeed((prev) => [post, ...prev].slice(0, 50)));
    sock.on('leaderboard_update',(lb)              => setLeaderboard(lb));
    sock.on('stats_update',      (updatedStat)     =>
      setStats((prev) => prev.map((s) => s.team_id === updatedStat.team_id ? { ...s, ...updatedStat } : s)));
    sock.on('points_earned',     ({ points, description, totalMatchPoints }) => {
      setMyMatchPts((p) => p + points);
      if (totalMatchPoints !== undefined) setMyMatchPts(totalMatchPoints);
      showNotification(`+${points} pts — ${description}`);
    });
    sock.on('momentum_update', (data) =>
      setStats((prev) => prev.map((s) => {
        const entry = s.team_id === data.home?.teamId ? data.home : data.away;
        return entry ? { ...s, momentum: entry.momentum } : s;
      })));
    sock.on('crowd_pulse_update', (pulseData) => setCrowdPulse(pulseData));

    return () => { sock.emit('leave_match', matchId); sock.disconnect(); };
  }, [matchId, user]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const votePoll = useCallback(async (optionId) => {
    if (!activePoll) return;
    try {
      const res = await pollAPI.vote(activePoll.id, optionId);
      showNotification(`+${res.pointsEarned} pts${res.isFirstVoter ? ' (first voter bonus!)' : ''}`);
    } catch (err) { showNotification(err.message); }
  }, [activePoll, showNotification]);

  const submitPrediction = useCallback(async (predData) => {
    try { return await reactionAPI.add(predData); }
    catch (err) { showNotification(err.message); throw err; }
  }, [showNotification]);

  const addReaction = useCallback(async (matchEventId, reactionType) => {
    try { await reactionAPI.add({ matchId, matchEventId, reactionType }); }
    catch (err) { showNotification(err.message); }
  }, [matchId, showNotification]);

  const postFeed = useCallback(async (content) => {
    try { await feedAPI.post({ matchId, content }); }
    catch (err) { showNotification(err.message); }
  }, [matchId, showNotification]);

  return (
    <MatchContext.Provider value={{
      match, stats, events, activePoll, activeEvent,
      reactions, feed, leaderboard, myEntry,
      viewerCount, myMatchPts, notification, loading,
      crowdPulse, goalEvent,
      votePoll, submitPrediction, addReaction, postFeed,
    }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used inside MatchProvider');
  return ctx;
};
