# New Features Specification — 8 Differentiators

Continuing from the core insight: every competitor shows you what *happened*. This system's moat is the **anticipation gap** — the 6–15 seconds between a big chance being detected and it resolving on screen. The four new features below deepen that moat further.

---

## Feature 5: Crowd Emotion Pulse (World First)

**What it is:** A live heatmap of emotional intensity across all fans watching the same match — aggregated from tap speed, response time, and explicit reactions. A waveform showing home fans vs away fans, updating every 5 seconds.

**Why no competitor can copy this:** Requires millions of fans actively tapping as the raw signal. FotMob has no engagement layer. This is a free byproduct of the prediction system.

**Technical implementation:**

Signal collection:
- Every fan tap is timestamped to millisecond precision in Firestore
- Tap speed (time from push receipt to tap) encodes urgency: 0.3s tap = high intensity, 2s tap = low
- Explicit emotion buttons (Tense / Excited / Anxious / Frustrated) supplement tap signals

Emotion classifier:
- Gemini 1.5 Flash running on 10-second rolling windows per fan
- Classifies into 5 states: tense, excited, frustrated, relieved, neutral
- Confidence threshold: 0.70 (lower than moment detection — less critical)

Aggregation:
- Firestore real-time listener aggregates by club allegiance
- Dual-track waveform: home fans vs away fans
- Update frequency: every 5 seconds (Firestore listener, not polling)

Moment annotation:
- Peak emotion moments automatically bookmarked
- Post-match: "Your group's most tense moment was 78' — Salah had a 0.62 xG chance"

---

## Feature 6: Fan Twin AI (Never Built Before)

**What it is:** After 10+ matches, Gemini builds a personalised football brain model — prediction patterns, tactical preferences, player ratings bias, emotional triggers. The model answers "Would I have made that sub?" and can challenge a friend's Twin head-to-head.

**The retention mechanism:** After 20 matches, a fan has an AI model that knows their football brain better than they do. Leaving means losing it. This is the switching cost — identical to why people don't switch note-taking apps.

**Data the Twin accumulates:**
- Prediction accuracy by: zone, player, game state (winning/losing/drawing), opponent
- Whether the fan is stats-led or instinct-led (measured by correlation between their picks and xG)
- Which players they consistently over-rate (predict too optimistically) vs under-rate
- Tactical preference inferred from manager mode decisions across 20+ matches
- Emotional profile: which game states trigger their most intense reactions

**Fan Twin × Social — Head-to-Head Challenge:**
Two friends put their Fan Twins against each other. The system runs a simulated match using both fans' historical decision patterns (substitutions, formation preference, risk tolerance) and declares a winner. Shareable as a 30-second animated card.

**Privacy:** Fan Twin data is stored only in the fan's own Firebase profile. Never shared or sold. Full deletion available in settings.

---

## Feature 7: Spatial Stadium Audio (Hardware Moat)

**What it is:** Using Pixel Buds Pro + Tracab ball position, the app recreates directional stadium crowd noise in real time. If play is near the away end, the crowd audio tilts right in the headphones. During a goal, the roar swells from all directions.

**Why only Google can build this:**
- Pixel Buds Pro: head-tracked spatial audio already supported
- Android Spatializer API: available since Android 13, binaural rendering
- Tracab data: 25Hz ball coordinates via PLDTS partnership
- Multi-track stadium audio: licensed from PL as part of the PLDTS deal

**Implementation:**

Ball position → stadium section mapping (per venue):
```
Anfield example:
ball_x < 25%  → Kop end   (channels: L-far, L-near)
ball_x 25–75% → Centre    (channels: all at moderate)
ball_x > 75%  → Away end  (channels: R-near, R-far)
```

Audio event signatures:
- Goal: full stadium roar, all channels, 3-second build then sustain
- Near miss: sharp intake, then groan — home or away depending on attacking team
- Red card: sudden volume spike from crowd near incident
- VAR check: low murmur of uncertainty, 20–30 seconds
- Final whistle: either sustained roar (home win) or silence then away chant

**Opt-in:** Audio companion is opt-in via a clear permissions flow. Works without mic (input is Tracab data only).

---

## Feature 8: Match Memory Timeline (Psychological Anchor)

**What it is:** Every match the fan watches builds a permanent personal timeline — not the official match record, but *their* version: every prediction, poll vote, manager decision, and emotion peak, annotated with what was happening on the pitch at that moment.

**Why this drives long-term retention:**
Once a fan has 20 matches of memory, leaving becomes psychologically costly. They'd lose their entire football history. This is deeper than feature lock-in — it's identity lock-in.

**Data stored per match event:**
```json
{
  "match_id": "afc_cfc_oct14_2025",
  "minute": 67,
  "event_type": "prediction",
  "prediction": "goal",
  "outcome": "correct",
  "points_earned": 35,
  "xg_at_moment": 0.51,
  "player": "Saka",
  "emotion_state": "tense",
  "group_emotion_pct": 94
}
```

**Season Wrapped — end of season:**
Gemini 1.5 Pro generates a "football year in review":
- Their most accurate match
- The prediction they got most wrong and why
- Their best manager mode call vs what the real manager did
- The moment their watch party group hit peak tension
- Their Fan Twin's biggest growth area

Delivered as a shareable animated video card (Cloud Functions + Canvas API → MP4). Positioned like Spotify Wrapped — designed to be shared on social media and drive acquisition.

**Off-match engagement:**
Match memory is the main reason fans open the app between matches — browsing their diary, comparing with friends, revisiting a legendary comeback. Target: 3 non-match opens per week for Season Ticket tier fans.
