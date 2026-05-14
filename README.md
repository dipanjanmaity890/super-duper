# ⚽ FanPulse — Live Sports Engagement Platform

> The AI-native second screen for live sports fans. Real-time polls, predictions, crowd emotion tracking and gamified rankings — all synced to the match.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Live Score Bar** | Sticky match header with live clock |
| **Crowd Emotion Pulse** | Real-time fan emotion intensity heatmap (home vs away) |
| **Win Probability Chart** | Live SVG chart computed from xG + score data |
| **Instant Polls** | Admin-created polls with live vote percentages |
| **Predictions** | Pre-event predictions with correct-answer point bonuses |
| **Reaction Bar** | Emoji reaction bursts on key moments (goal, red card, etc.) |
| **Fan Feed** | Live match chat (≤ 280 chars) |
| **Live Stats** | Possession, shots, xG, cards — updates via WebSocket |
| **Leaderboard** | Per-match and global points rankings |
| **Admin Panel** | Full match-control UI (start/end, add events, polls, stats) |

---

## 🚀 Quick Start (Docker — recommended)

```bash
# 1. Clone and enter the project
cd fan-pulse

# 2. Launch all services (Postgres + API + React)
docker-compose up --build

# 3. Open browser
open http://localhost:5173
```

Docker handles everything: database creation, schema migration, and both servers.

---

## 🛠 Manual Setup (without Docker)

### Prerequisites
- Node 20+
- PostgreSQL 14+ running locally

### 1. Backend

```bash
cd backend
cp .env.example .env          # Edit DATABASE_URL to point to your local Postgres
npm install
npm run db:migrate            # Creates all tables
npm run db:seed               # Seeds demo teams, matches, users
npm run dev                   # Starts API on :4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # Starts Vite dev server on :5173
```

---

## 🔑 Demo Accounts

| Role  | Email | Password | Notes |
|---|---|---|---|
| **Admin** | `admin@demo.com` | `admin123` | Full match control via `/admin` |
| Fan 1 | `ace@demo.com` | `demo123` | TacticalAce — 340 pts |
| Fan 2 | `kick@demo.com` | `demo123` | KickBoss99 — 290 pts |
| Fan 3 | `striker@demo.com` | `demo123` | StrikerGuru — 255 pts |

---

## 🎮 Demo Flow

1. **Admin** logs in → navigates to `/admin`
2. Clicks **▶ Start Match** on MCF vs ARN
3. Adds a **goal** event (player: Kane, minute: 18) → score updates live
4. Creates a **poll** ("Who wins?") → appears instantly on fan screens
5. **Fan** logs in on a separate tab/device → sees live updates in real-time
6. Fan votes in poll, reacts to goal moment, taps Crowd Pulse emotion buttons
7. Points are awarded and the leaderboard updates live

---

## 🏗 Architecture

```
fan-pulse/
├── backend/                  Express + Socket.io + PostgreSQL
│   └── src/
│       ├── config/           db.js, socket.js
│       ├── controllers/      auth, match, poll, prediction, engagement, teams
│       ├── db/               schema.sql, migrate.js, seed.js
│       ├── middleware/        auth (JWT), errorHandler
│       ├── routes/           auth, matches, polls, teams, engagement
│       └── services/         pointsService, matchEventService
├── frontend/                 React 18 + Vite
│   └── src/
│       ├── components/       ScoreBar, WinProbChart, CrowdPulse, Widgets, Panels, EventTimeline
│       ├── context/          AuthContext, MatchContext (WebSocket hub)
│       ├── pages/            Auth, Lobby, Match, Admin
│       └── services/         api.js (typed fetch wrappers)
├── docs/                     Feature specs, data model, integration guides
└── docker-compose.yml
```

### Real-Time Events (Socket.io)

| Event | Direction | Payload |
|---|---|---|
| `join_match` | Client → Server | `matchId` |
| `match_event` | Server → Client | Event object |
| `score_update` | Server → Client | `{ home_score, away_score }` |
| `new_poll` | Server → Client | Poll + options |
| `poll_update` | Server → Client | `{ pollId, options }` with live % |
| `reaction_update` | Server → Client | `{ eventId, counts }` |
| `crowd_pulse_update` | Server → Client | `{ homeIntensity, awayIntensity, ... }` |
| `leaderboard_update` | Server → Client | Top 10 array |
| `points_earned` | Server → Client | `{ points, description }` |
| `feed_post` | Server → Client | New post object |

---

## 🗄 Database

PostgreSQL schema with tables:
`users` · `teams` · `matches` · `match_events` · `match_stats` · `polls` · `poll_options` · `poll_votes` · `predictions` · `reactions` · `reaction_counts` · `fan_feed_posts` · `match_leaderboard` · `points_log`

---

## 🌍 Environment Variables (Backend)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `PORT` | `4000` | API server port |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `NODE_ENV` | `development` | Environment |

---

## 🏆 Points System

| Action | Points |
|---|---|
| Vote in poll | +10 |
| First voter bonus | +15 |
| React to moment | +5 |
| Correct prediction (standard) | +50 |
| Correct prediction (upset) | +80 |
| Correct prediction bonus | +50% of reward |

---

## 📡 API Reference

```
POST /api/auth/register          Create account
POST /api/auth/login             Sign in
GET  /api/auth/me                Current user

GET  /api/matches                List matches (?status=live,scheduled)
GET  /api/matches/:id            Match detail + stats + events + active poll
POST /api/matches           [A]  Create match
POST /api/matches/:id/start [A]  Start match
POST /api/matches/:id/end   [A]  End match
POST /api/matches/:id/events [A] Add match event
PATCH /api/matches/:id/stats [A] Update stats

GET  /api/teams                  List all teams

POST /api/polls             [A]  Create poll
GET  /api/polls/:id              Get poll with live %
POST /api/polls/:id/vote         Vote in poll

POST /api/predictions            Submit prediction
GET  /api/predictions/match/:id  User's predictions

POST /api/reactions              React to event
GET  /api/reactions/:eventId     Get reaction counts

POST /api/feed                   Post to fan feed
GET  /api/feed/:matchId          Get match feed (paginated)

GET  /api/leaderboard/:matchId   Match leaderboard
GET  /api/leaderboard/global     All-time leaderboard

POST /api/crowd-pulse/:matchId   Submit emotion tap
GET  /api/crowd-pulse/:matchId   Get current crowd pulse state

[A] = Admin only
```

---

## 📦 Tech Stack

- **Frontend**: React 18, Vite, Socket.io-client, CSS Modules
- **Backend**: Node.js, Express, Socket.io, bcryptjs, jsonwebtoken
- **Database**: PostgreSQL 16 (pg library, raw SQL)
- **Security**: helmet, express-rate-limit, JWT auth, CORS
- **Infrastructure**: Docker Compose (one command startup)
