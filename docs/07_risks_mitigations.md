# 07 — Risks & Mitigations

## Risk 1: Broadcast Delay Variance — HIGH

**Problem:** Broadcast delay varies per household (satellite ~7s, IPTV ~3s, streaming 1–30s). If a prediction card arrives before the fan has seen the chance on screen, the experience is ruined — and potentially spoils the goal.

**Mitigation:**
- ACR sync calibrated per device (±1s accuracy)
- For YouTube TV users: exact timecode (no ACR needed)
- High-delay users (>20s measured offset): suppress prediction cards entirely, show only post-hoc whispers
- Manual override in settings: "My delay is X seconds"
- Test: validate ACR accuracy against known broadcast offsets before launch

---

## Risk 2: Notification Fatigue — MEDIUM-HIGH

**Problem:** Too many interactions → fans disable notifications within 2–3 sessions. Churned notification permissions almost never recover.

**Mitigation:**
- Hard cap: 12 interactions per 90 minutes
- After 4 consecutive missed taps: drop to passive-only (whispers, no polls)
- No pushes for 60 seconds post-goal (celebration window)
- A/B test: 8 vs 12 vs 16 interactions per match on D14 retention
- Track notification opt-out rate daily in week 1 — if >5%, pause and audit

---

## Risk 3: Gambling Regulation Misclassification — HIGH

**Problem:** UK Gambling Commission has been aggressive about apps with prediction mechanics + reward systems. Misclassification requires a full gambling license or product shutdown.

**Mitigation:**
- Points have zero monetary value — documented and legally reviewed
- Pre-launch legal review with Wiggin LLP or specialist gambling counsel
- Proactive GC consultation session before launch
- No betting company partnerships within same app surface
- xG-adjusted scoring (rewards knowledge) documented explicitly in legal submission
- App Store compliance review for both platforms before submission

---

## Risk 4: Opta Feed Latency Spike — MEDIUM

**Problem:** Goal events cause simultaneous spike on the Opta API across all customers. During a 90th-minute equaliser, the feed can lag 5–8s — well above the 1.8s target.

**Mitigation:**
- SLA negotiation with Stats Perform for dedicated Google feed with higher throughput
- Fallback: Vertex AI model infers likely event type from Tracab tracking data (ball enters box, keeper dives) even before the official event — 0.7+ confidence inference can fire 1–2s earlier than the official event
- Circuit breaker: if Opta latency >4s for 3 consecutive events, switch to tracking-only inference mode

---

## Risk 5: Engagement Skews to Hardcore Fans — LOW-MEDIUM

**Problem:** Deep features (manager mode, voice companion, heatmap) may only attract the 15–20% already very engaged — missing the casual majority who are the largest audience.

**Mitigation:**
- Tiered interaction model: whispers-only for new users, deeper features unlocked progressively
- Track median user (not mean) engagement — mean is skewed by power users
- If casual fan session length <5 minutes: redesign whisper format (funnier, more surprising, less data-heavy)
- Whispers should be emotionally resonant, not just statistical: "That's the fastest sprint at the Emirates since 2019" > "36.8 km/h sprint recorded"

---

## Risk 6: PL Partnership Takes Longer Than Expected — HIGH

**Problem:** 6–12 month negotiation is an optimistic estimate. PL partnerships involve multiple stakeholders (clubs, broadcast partners, commercial teams). Could slip to 18+ months.

**Mitigation:**
- Start with Opta deal immediately (independent of PL) — builds the technical foundation
- Run pilot with 2–3 willing clubs (Arsenal and Man City have historically been open to tech partnerships) under a non-official branding arrangement
- Pilot data strengthens the PL pitch: "Here's what 500k fans looked like in 10 matches"
- Have a non-PL fallback: launch with Championship data first (lower rights complexity, same tech stack)
