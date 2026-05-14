# Google Agentic Premier League — Fan Experience System
### Complete System Design & Feature Specification

---

## What This Is

A second-screen AI platform that transforms passive sports viewing into real-time fan participation. Built natively on Google's infrastructure stack, it works across Android, Wear OS, Android TV, Nest Hub, and Pixel Buds Pro.

**The core insight:** Every competitor (FotMob, Sky Sports, OneFootball) shows you what *happened*. This system pulls fans into what is *about to happen* — and remembers every call they've ever made.

---

## The Four Moats (Why No Competitor Can Copy This)

### 1. Anticipation Gap (6–15 seconds)
The window between a big chance being detected via live xG and it resolving on screen. No competitor has live xG + broadcast sync + push infrastructure to occupy this window. This is the product's heartbeat.

### 2. Crowd Emotion Pulse — World First
A live heatmap of emotional intensity across all fans watching the same match. Requires millions of fans actively tapping as the raw signal — FotMob has no engagement layer, so they have no data to feed the classifier. This is a byproduct of having the prediction system. It costs almost nothing extra once the core exists.

### 3. Fan Twin AI — Never Built Before
After 20 matches, Gemini builds a personalised football brain model of each fan — their prediction patterns, tactical preferences, blind spots. Leaving means losing that model. It's the same reason people don't switch note-taking apps: the switching cost is the accumulated intelligence, not the features.

### 4. Spatial Stadium Audio — Hardware Moat
Pixel Buds Pro + Tracab ball coordinates + Android Spatializer API. A combination only Google can assemble. Turns a product differentiator into a device sales argument. Apple could theoretically do it for PL content on Apple TV — but they have no live match data partnerships.

### 5. Match Memory — Psychological Anchor
Once someone has a diary of every prediction across three seasons — their best call, their worst, the match their group peaked at 94% tension — they will never delete the app.

---

## Folder Structure

```
google_agentic_pl/
├── README.md                          ← This file
├── docs/
│   ├── 01_system_overview.md          ← Full system architecture
│   ├── 02_ai_agents.md                ← 4 AI agents specification
│   ├── 03_data_sources.md             ← Real data integrations
│   ├── 04_engagement_loop.md          ← Psychology & retention
│   ├── 05_gamification.md             ← Points, tiers, rewards
│   ├── 06_partnership_roadmap.md      ← Who to sign & when
│   └── 07_risks_mitigations.md        ← Top risks & how to handle
├── architecture/
│   ├── data_pipeline.md               ← Opta→PubSub→Vertex pipeline
│   ├── broadcast_sync.md              ← ACR + YouTube TV timecode sync
│   ├── latency_budget.md              ← End-to-end timing targets
│   └── firebase_data_model.md         ← Firestore schema
├── features/
│   ├── new_features_spec.md           ← All 8 differentiating features
│   ├── fan_twin_ai.md                 ← Fan Twin deep spec
│   ├── crowd_emotion_pulse.md         ← Emotion heatmap spec
│   ├── spatial_audio.md               ← Pixel Buds + Tracab spec
│   └── match_memory.md                ← Memory timeline spec
├── cricket_api/
│   ├── integration_guide.md           ← CricketData.org API wiring
│   ├── endpoints_reference.md         ← All endpoints used
│   └── live_dashboard_spec.md         ← Live dashboard architecture
└── app_screens/
    ├── screen_specs.md                ← All screen UX specs
    ├── prediction_card.md             ← Live prediction card design
    ├── manager_mode.md                ← Manager mode UX
    └── post_match_debrief.md          ← Debrief screen spec
```

---

## Quick Start — MVP Build Order

1. Wire Opta F9 feed → Cloud Run bridge → Pub/Sub
2. Deploy Moment Detection Agent on Vertex AI (Gemini 1.5 Pro)
3. Build Firebase fan profile + FCM push
4. Ship prediction cards on Android (MVP)
5. Add stat whispers (passive layer)
6. Post-match debrief (retention hook)
7. Add emotion pulse, Fan Twin, spatial audio (V2)

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Agents | Vertex AI + Gemini 1.5 Pro / Flash |
| Event Bus | Google Cloud Pub/Sub |
| Fan Profiles | Firebase Realtime DB + BigQuery ML |
| Push Delivery | Firebase Cloud Messaging (FCM) |
| Voice | Gemini Live (Android) |
| Broadcast Sync | ACRCloud + YouTube TV Companion SDK |
| Player Tracking | Tracab WebSocket (via PLDTS) |
| Match Events | Opta F9 (Stats Perform) |
| xG Data | StatsBomb 360 |
| Cricket Data | CricketData.org API (cricapi.com v1) |
| Spatial Audio | Android Spatializer API + Pixel Buds Pro |

---

*Built for Google Agentic Premier League — May 2026*
