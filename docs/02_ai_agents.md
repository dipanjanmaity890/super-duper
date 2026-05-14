# 02 — AI Agents Specification

Four specialised Gemini-powered agents, each with a defined scope and output contract, coordinated by a root orchestrator on Vertex AI Agent Engine.

---

## Agent 1: Moment Detection Agent

**Model:** Gemini 1.5 Pro  
**Trigger:** Every Pub/Sub message from Opta F9 feed  
**SLA:** Emit classified MatchMoment within 1.8s of event occurrence  
**Confidence threshold:** 0.82 (below this, suppress)

### Moment Taxonomy (12 types)
| Type | Trigger Condition | Interaction Fired |
|---|---|---|
| Goal | event_type = goal | Stat whisper + reaction sync |
| Big chance | xG > 0.35 | Prediction card |
| Corner (danger) | corner + attacking third | Prediction card |
| VAR check | VAR flag in feed | Fan verdict poll |
| Red card | event_type = red_card | Stat whisper + manager mode |
| Sprint | speed ≥ 33 km/h (Opta speed event) | Stat whisper |
| Penalty awarded | event_type = penalty | Prediction + fan verdict |
| Half time | match_status = HT | Manager mode + HT summary |
| 60th minute | clock = 60:00 | Manager mode (sub prompt) |
| Full time | match_status = FT | AI debrief + share card |
| Missed penalty | event_type = penalty_miss | Reaction sync |
| Injury | event_type = injury | Squad depth whisper |

### Output Schema (MatchMoment protobuf)
```proto
message MatchMoment {
  string match_id = 1;
  string event_id = 2;
  MomentType moment_type = 3;
  float confidence = 4;
  int32 match_minute = 5;
  string player_id = 6;
  string team_id = 7;
  float xg_value = 8;
  float player_x = 9;
  float player_y = 10;
  int64 timestamp_ms = 11;
}
```

---

## Agent 2: Fan Personalisation Agent

**Model:** BigQuery ML scoring + Gemini context window  
**Trigger:** Each MatchMoment event  
**Output:** Ranked list of fans + interaction_type per fan

### Per-fan context window includes:
- Supported club + favourite players
- Historical tap rate (last 5 matches)
- Last interaction timestamp (suppression check)
- Tier level (Kickoff / Regular / Season Ticket / Ultra)
- Broadcast offset (from ACR or YouTube TV SDK)

### Relevance scoring
```
base_score = 0.5
+ 0.4 if moment involves fan's followed player
+ 0.3 if moment involves fan's supported club
+ 0.2 if fan is in "deep fan" tier (3+ taps this match)
- 0.5 if fan inactive > 4 min (passive mode)
→ if final_score < 0.6: suppress interaction
```

---

## Agent 3: Content Generation Agent

**Model:** Gemini 1.5 Flash (faster, lower cost)  
**Trigger:** Personalisation payload from Agent 2  
**Output:** One of 3 content formats: card / poll / whisper

### Tone calibration
- Arsenal fan watching Arsenal: enthusiastic, first-person ("Saka is cooking")
- Neutral fan: analytical, stat-led
- Away fan: balanced, empathetic framing

### Output constraints
- Card: max 18 words question + 2 options (Yes/No or A/B)
- Whisper: max 22 words, one stat, one comparison
- Poll: max 15 word question + 2–3 options

### Grounding
All content grounded via Vertex AI Grounding API to live match facts. No hallucinated stats.

---

## Agent 4: Social Fabric Agent

**Model:** Firestore Real-time + Perspective API  
**Trigger:** All fan responses aggregated  
**Output:** Leaderboard updates, watch party sync, post-match debrief

### Responsibilities
- Aggregates fan responses within 200ms using Firestore real-time listeners
- Runs Perspective API safety filter on all user-generated text before surfacing
- Generates group pulse bar (watch party emotional state)
- At full time: triggers Gemini 1.5 Pro for personalised debrief generation
- Produces shareable post-match card (PNG via Cloud Functions + Canvas API)

### Post-match debrief generation prompt template
```
You are generating a personalised 90-second cricket/football match debrief.
Fan profile: {fan_profile_json}
Match data: {match_summary_json}
Prediction history this match: {prediction_results_json}
Format: 3 sentences max. Mention their best prediction. 
Their accuracy percentile vs all fans of same club today.
The single most decisive moment by xG. Warm, personal tone.
```
