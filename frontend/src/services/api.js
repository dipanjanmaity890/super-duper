// In production, VITE_API_URL is baked in at build time pointing to Cloud Run backend
const API_BASE = import.meta.env.VITE_API_URL || '';
const BASE = `${API_BASE}/api`;


const getToken = () => localStorage.getItem('fp_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (body) =>
    fetch(`${BASE}/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  login: (body) =>
    fetch(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  me: () =>
    fetch(`${BASE}/auth/me`, { headers: headers() }).then(handle),
};

// ─── Matches ──────────────────────────────────────────────────────────────────
export const matchAPI = {
  list: (status = 'live,scheduled') =>
    fetch(`${BASE}/matches?status=${status}`, { headers: headers() }).then(handle),
  get: (id) =>
    fetch(`${BASE}/matches/${id}`, { headers: headers() }).then(handle),
  create: (body) =>
    fetch(`${BASE}/matches`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  start: (id) =>
    fetch(`${BASE}/matches/${id}/start`, { method: 'POST', headers: headers() }).then(handle),
  end: (id) =>
    fetch(`${BASE}/matches/${id}/end`, { method: 'POST', headers: headers() }).then(handle),
  addEvent: (id, body) =>
    fetch(`${BASE}/matches/${id}/events`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  updateStats: (id, body) =>
    fetch(`${BASE}/matches/${id}/stats`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(handle),
};

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teamsAPI = {
  list: () =>
    fetch(`${BASE}/teams`, { headers: headers() }).then(handle),
};

// ─── Polls ────────────────────────────────────────────────────────────────────
export const pollAPI = {
  get: (id) =>
    fetch(`${BASE}/polls/${id}`, { headers: headers() }).then(handle),
  vote: (id, optionId) =>
    fetch(`${BASE}/polls/${id}/vote`, { method: 'POST', headers: headers(), body: JSON.stringify({ optionId }) }).then(handle),
  create: (body) =>
    fetch(`${BASE}/polls`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  resolve: (id, correctOptionId) =>
    fetch(`${BASE}/polls/${id}/resolve`, { method: 'POST', headers: headers(), body: JSON.stringify({ correctOptionId }) }).then(handle),
};

// ─── Predictions ──────────────────────────────────────────────────────────────
export const predAPI = {
  submit: (body) =>
    fetch(`${BASE}/predictions`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  forMatch: (matchId) =>
    fetch(`${BASE}/predictions/match/${matchId}`, { headers: headers() }).then(handle),
};

// ─── Reactions ────────────────────────────────────────────────────────────────
export const reactionAPI = {
  add: (body) =>
    fetch(`${BASE}/reactions`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  get: (matchEventId) =>
    fetch(`${BASE}/reactions/${matchEventId}`, { headers: headers() }).then(handle),
};

// ─── Fan Feed ─────────────────────────────────────────────────────────────────
export const feedAPI = {
  get: (matchId, offset = 0) =>
    fetch(`${BASE}/feed/${matchId}?limit=20&offset=${offset}`, { headers: headers() }).then(handle),
  post: (body) =>
    fetch(`${BASE}/feed`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const leaderboardAPI = {
  match: (matchId) =>
    fetch(`${BASE}/leaderboard/${matchId}`, { headers: headers() }).then(handle),
  global: () =>
    fetch(`${BASE}/leaderboard/global`, { headers: headers() }).then(handle),
};

// ─── Crowd Pulse ──────────────────────────────────────────────────────────────
export const crowdPulseAPI = {
  get: (matchId) =>
    fetch(`${BASE}/crowd-pulse/${matchId}`, { headers: headers() }).then(handle),
  tap: (matchId, emotion, teamSide) =>
    fetch(`${BASE}/crowd-pulse/${matchId}`, { method: 'POST', headers: headers(), body: JSON.stringify({ emotion, teamSide }) }).then(handle),
};
