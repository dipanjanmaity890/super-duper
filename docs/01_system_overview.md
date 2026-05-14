# 01 — System Overview

## What the System Does

Three things simultaneously, every match:

1. **Detects** key moments from live data in under 1.8 seconds
2. **Personalises** which interaction each fan receives based on their profile
3. **Delivers** that interaction to the right surface before the moment resolves on TV

## Architecture Layers

### Data Layer — Live Inputs
- **Opta F9 Feed** — goals, shots, cards, set pieces; timestamped to the second via AMQP
- **StatsBomb 360** — xG, xA, pressure data at event level (~2s lag)
- **Tracab WebSocket** — player x/y/z coordinates at 25Hz for all 20 PL clubs
- **Google One Tap** — fan identity, club allegiance, device profile

### Orchestration — Google AI Stack
```
Opta AMQP → Cloud Run Bridge → Pub/Sub (match-events topic)
                                    ↓
                            Eventarc Trigger
                                    ↓
                    Vertex AI — Moment Detection Agent
                                    ↓
                    BigQuery ML — Fan Personalisation Score
                                    ↓
                    Gemini Flash — Content Generation
                                    ↓
                    FCM — Device Push (offset-adjusted)
```

### Output Surfaces
| Surface | Interaction Type | Latency Target |
|---|---|---|
| Android / iOS | Predictions, polls, whispers, watch party | <2.1s |
| Android TV / Nest Hub | Ambient heatmap, xG ticker | <3s |
| Wear OS | Single-tap vote, score glance | <2s |
| Pixel Buds Pro | Spatial stadium audio | Real-time |
| Google Assistant | Voice Q&A with live grounding | <1.5s |

## Suppression Rules (Critical)
- Max 1 interaction per 90-second window per fan
- No push if fan inactive for 4+ minutes (passive mode)
- No duplicate interaction types within 15-minute window
- Prediction cards suppressed if previous prediction unresolved
- No interactions during 60-second goal celebration window

## Fan Segmentation
| Tier | Criteria | Interactions Unlocked |
|---|---|---|
| Kickoff | 0–500 pts | Stat whispers only |
| Regular | 500–2k pts | + Predictions + polls |
| Season Ticket | 2k–10k pts | + Manager mode |
| Ultra | 10k+ pts | + Voice companion early access |
