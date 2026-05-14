# 03 — Real Data Sources & Integration

## Primary Event Feed — Opta (Stats Perform)

**API:** Opta F9 / Feeds Live  
**Protocol:** AMQP (RabbitMQ) or REST polling  
**Latency:** ~1.5s event delay  
**Cost estimate:** ~£800/match (PL tier)

```http
POST https://api.statsperform.com/v1/feeds/live
Authorization: Bearer {API_KEY}
X-Feed-Type: F9
X-Competition: EPL
X-Season: 2025-26
```

**Bridge pattern (Opta → Pub/Sub):**
```
opta_amqp_queue 
  → Cloud Run bridge service (99.9% SLA during match windows)
  → pubsub://match-events topic
  
Message schema:
{
  event_id, match_id, minute, second,
  event_type, player_id, team_id,
  x, y, xg_value, speed_kmh
}
```

---

## xG & Pressure Data — StatsBomb 360

**API:** REST, ~2s lag on live feed  
**Cost estimate:** ~£400/match

```http
GET https://data.statsbomb.com/api/v3/events
  ?match_id={LIVE_MATCH_ID}
  &type=shot,pressure,carry
Authorization: Bearer {API_KEY}
```

---

## Player Tracking — Tracab (via PLDTS)

**Protocol:** WebSocket, 25Hz  
**Access:** Requires Premier League PLDTS partnership (all 20 clubs)

```
wss://tracab-live.pldts.com/match/{match_id}?token={AUTH}

Frame payload:
{
  "frame": 1234,
  "players": [
    {"id": 7, "x": 4523, "y": 3210, "speed": 33.4, "team": "home"}
  ],
  "ball": {"x": 4100, "y": 3400, "z": 120}
}
```

**Cache layer:** Redis Memorystore, TTL = 100ms (4 frames at 25Hz)

---

## Broadcast Sync — ACRCloud

**Purpose:** Calibrate per-household broadcast delay  
**SDK:** Android (background mic fingerprint, 5–10s audio sample)

```java
ACRCloudClient client = new ACRCloudClient(context, config);
client.startRecognize();
// Returns: {"match":{"broadcast_timecode":"75:23","offset_ms":6800}}
```

**For YouTube TV users:** Exact timecode via Google TV Companion SDK (no ACR needed)

```kotlin
val currentTimecode = YoutubeTVCompanion
  .getActiveBroadcast()
  .getCurrentTimecodeMs()
```

**FCM offset-adjusted delivery:**
```
push_time = event_time_ms + fan.broadcast_offset_ms
fcm.sendAt(fan.device_token, push_time, payload)
```

---

## Cricket Data — CricketData.org (CricAPI v1)

**Base URL:** `https://api.cricapi.com/v1/`  
**Auth:** `?apikey={YOUR_KEY}`  
**Format:** JSON

### Endpoints Used

| Endpoint | Purpose | Refresh |
|---|---|---|
| `/currentMatches` | Live + recent matches | 30s |
| `/match_scorecard?id={id}` | Ball-by-ball scorecard | 15s |
| `/matches` | Upcoming fixtures | 5min |
| `/series` | Current series list | 1hr |

### Integration Pattern (server-side proxy)
```javascript
// Cloud Run proxy — avoids CORS + hides API key
app.get('/api/live', async (req, res) => {
  const data = await fetch(
    `https://api.cricapi.com/v1/currentMatches?apikey=${CRICKET_API_KEY}&offset=0`
  );
  res.json(await data.json());
});
```

---

## Latency Budget (End-to-End)

| Event Type | Target | Breakdown |
|---|---|---|
| Goal → stat whisper | ~2.1s | Opta 150ms + Pub/Sub 80ms + Vertex 600ms + personalisation 200ms + content gen 400ms + FCM 150ms + screen 50ms |
| Big chance → prediction card | ~1.6s | Same pipeline, Flash model (faster) |
| VAR check → poll | ~3.0s | VAR takes 30–90s so low urgency |
| Voice query → Gemini answer | <1.5s | Gemini Live streaming response |

---

## Cost Estimate Per Match

| Component | Cost |
|---|---|
| Opta F9 feed | ~£800 |
| StatsBomb 360 | ~£400 |
| Tracab (via PL deal) | Bundled |
| Cloud Run + Pub/Sub | ~£120 |
| Vertex AI inference | ~£200 |
| Firebase + FCM | ~£50 |
| **Total** | **~£1,570/match** |

380 PL matches/season = ~£596,000/season in data + infra costs.
