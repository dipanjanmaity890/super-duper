# Cricket API Integration Guide — CricketData.org (CricAPI v1)

## API Details

**Provider:** CricketData.org (formerly CricAPI)  
**Base URL:** `https://api.cricapi.com/v1/`  
**Auth:** Query param `?apikey={YOUR_KEY}`  
**Format:** JSON  
**Free tier:** Available (rate limited)

> ⚠️ SECURITY: Never expose your API key client-side. Always proxy through a backend server.

---

## Endpoints Reference

### 1. Current / Live Matches
```
GET https://api.cricapi.com/v1/currentMatches?apikey={KEY}&offset=0
```
Returns live + recently completed matches. Poll every 30 seconds during a match.

Key response fields:
```json
{
  "id": "match-uuid",
  "name": "India vs Australia, 1st Test",
  "matchType": "test",
  "status": "India won by 6 wickets",
  "venue": "Wankhede Stadium, Mumbai",
  "date": "2025-11-15",
  "dateTimeGMT": "2025-11-15T04:00:00",
  "teams": ["India", "Australia"],
  "score": [
    {"r": 342, "w": 8, "o": 90.2, "inning": "India Inning 1"},
    {"r": 210, "w": 10, "o": 68.4, "inning": "Australia Inning 1"}
  ],
  "matchStarted": true,
  "matchEnded": false
}
```

### 2. Match Scorecard (Ball-by-Ball)
```
GET https://api.cricapi.com/v1/match_scorecard?apikey={KEY}&id={MATCH_ID}
```
Returns full batting + bowling scorecard for a match. Poll every 15 seconds during live play.

Key response fields:
```json
{
  "scorecard": [
    {
      "inning": "India Inning 1",
      "batting": [
        {
          "batsman": "Virat Kohli",
          "r": 82, "b": 94, "4s": 9, "6s": 1,
          "dismissal-text": "c Maxwell b Starc"
        }
      ],
      "bowling": [
        {
          "bowler": "Mitchell Starc",
          "o": "18.4", "m": 2, "r": 67, "w": 4
        }
      ]
    }
  ]
}
```

### 3. Upcoming Matches
```
GET https://api.cricapi.com/v1/matches?apikey={KEY}&offset=0
```
Returns all scheduled matches. Filter by `matchStarted: false`.

### 4. Series List
```
GET https://api.cricapi.com/v1/series?apikey={KEY}&offset=0
```
Returns current and upcoming series with match counts and date ranges.

---

## Server-Side Proxy (Recommended Architecture)

```javascript
// Cloud Run / Express.js proxy service
const express = require('express');
const app = express();
const CRICKET_KEY = process.env.CRICKET_API_KEY; // Set in Cloud Run env vars

app.get('/api/cricket/live', async (req, res) => {
  try {
    const resp = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICKET_KEY}&offset=0`
    );
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.get('/api/cricket/scorecard/:id', async (req, res) => {
  try {
    const resp = await fetch(
      `https://api.cricapi.com/v1/match_scorecard?apikey=${CRICKET_KEY}&id=${req.params.id}`
    );
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.listen(8080);
```

**Deploy to Cloud Run:**
```bash
gcloud run deploy cricket-proxy \
  --source . \
  --set-env-vars CRICKET_API_KEY=your_key_here \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Live Date & Time Integration

The dashboard shows real-time IST clock, updating every second:

```javascript
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  document.getElementById('clock').textContent = timeStr;
  document.getElementById('date').textContent = dateStr + ' · IST';
}

setInterval(updateClock, 1000);
updateClock(); // Immediate first render
```

---

## Match Data → Moment Detection Bridge

For cricket, the Moment Detection Agent needs to be adapted:

| Cricket Event | Trigger Condition | Fan Interaction |
|---|---|---|
| Wicket | wicket in ball-by-ball | Stat whisper + prediction (next batter) |
| Six | runs = 6 in ball-by-ball | Stat whisper (distance, shot type) |
| Maiden over | w=0, runs=0 over | Bowling stat whisper |
| 50 / 100 milestone | batsman runs hit threshold | Celebration whisper |
| Last 5 overs (T20) | over ≥ 16 | Prediction: total runs in over |
| Final over | over = 20 | Prediction: match winner |
| DLS adjustment | DLS event flag | Fan verdict: fair or unfair? |

---

## Rate Limits & Plan Guidance

| Plan | Requests/day | Live score | Ball-by-ball |
|---|---|---|---|
| Free | 100 | Yes (delayed) | No |
| Hobbyist | 1,000 | Yes | Limited |
| Professional | 10,000+ | Yes | Yes |
| Enterprise | Custom | Yes + WebSocket | Full |

For production with 100k+ concurrent fans, negotiate an Enterprise plan with WebSocket delivery — eliminates polling overhead.
