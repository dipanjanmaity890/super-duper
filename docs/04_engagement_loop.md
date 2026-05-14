# 04 — Engagement Loop & Retention Psychology

## The Five-Step Habit Loop

### Step 1: Trigger — The Match Starts
Push notification 15 minutes before kickoff:
> "Arsenal vs Chelsea starts in 15 min. Your predictions are open. Your rivals' picks are already in."

Variable-reward framing ("rivals already in") increases open rate by ~23% vs neutral framing.

Delivery channels:
- FCM push (Android / iOS)
- Wear OS haptic (gentle, 2-pulse)
- Android TV home screen banner
- Nest Hub ambient display activation

### Step 2: Action — Micro-Interactions During Play
**Design principle: max 3 seconds per interaction.**

The app must never pull attention away from the game for more than a glance. Every screen is designed for peripheral engagement, not focused use. No long forms, no navigation, no menus during a match.

Single-tap UX for all in-match interactions:
- Prediction: 2 buttons, resolved in 8–15s
- Poll: 2–3 options, tap one
- Manager mode: card list, tap one player
- Emotion: 4 buttons, tap your state

### Step 3: Variable Reward — Did Your Prediction Land?
**Resolution window: 8–15 seconds** (this number is the product's most important design decision)

- Short enough: fan still remembers making the prediction
- Long enough: genuine tension exists
- Resolution card: green tick + points if correct, grey cross if wrong + stat explaining why

This is structurally identical to a slot pull — but grounded entirely in real football outcomes. The randomness is the sport itself, not manufactured.

### Step 4: Investment — Personalisation Deepens Over Time
After 5 matches: "You've correctly predicted 68% of Saka shots — your best player read in the squad."

After 20 matches: the system knows which moment types the fan engages with most. Everything else is suppressed. The product becomes more accurate and less noisy over time.

After 3 seasons: the fan has a full football diary, a Fan Twin AI model, and a prediction accuracy leaderboard history. **The switching cost is not the features — it's the accumulated intelligence.**

### Step 5: Social Pressure — Friends & Leaderboards
- Watch party rail: friends' predictions in real time
- Weekly leaderboard: Google contacts ranked by prediction accuracy
- Fan Twin challenges: head-to-head AI brain comparisons

**Opt-in only, never forced.** But apps with social leaderboards show 2.3× higher D30 retention vs solo play (internal benchmark).

---

## Retention Targets

| Metric | Target |
|---|---|
| D7 retention | 72% |
| D30 retention | 54% |
| Avg taps per match | 8.4 |
| Avg session length | 23 minutes |
| Notification opt-out rate | <8% |
| Prediction accuracy (fans, median) | 58–64% |

---

## Notification Fatigue — The Biggest Risk

**Hard cap:** 12 interactions per 90 minutes.
**Passive trigger:** After 4 consecutive missed taps → drop to whispers-only mode.
**Celebration window:** No pushes for 60 seconds after a goal (respect the moment).
**A/B test plan:** Compare 8 vs 12 vs 16 interactions per match on D14 retention.

Once notification permissions are revoked, they almost never recover. This is the single most important product health metric to watch in week 1.
