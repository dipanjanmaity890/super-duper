# Firebase Data Model — Full System Schema

## Firestore Collections

### /fans/{fanId}
```json
{
  "displayName": "James Kumar",
  "email": "james@example.com",
  "supportedClub": "arsenal",
  "favouritePlayers": ["saka", "odegaard"],
  "tier": "season_ticket",
  "totalPoints": 4820,
  "seasonPoints": 1240,
  "broadcastOffsetMs": 6800,
  "broadcastSyncMethod": "acr",
  "lastActiveMatch": "afc_cfc_oct14_2025",
  "lastTapTimestamp": 1729000000000,
  "notificationsEnabled": true,
  "deviceTokens": ["fcm_token_1", "fcm_token_2"],
  "createdAt": "2025-08-01T00:00:00Z"
}
```

### /fans/{fanId}/matchHistory/{matchId}
```json
{
  "matchId": "afc_cfc_oct14_2025",
  "date": "2025-10-14",
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "finalScore": "2-1",
  "pointsEarned": 340,
  "predictionsTotal": 10,
  "predictionsCorrect": 7,
  "accuracyPct": 70,
  "percentileVsFans": 81,
  "peakEmotionMinute": 78,
  "peakEmotionState": "tense",
  "groupEmotionPctPeak": 94,
  "events": [
    {
      "minute": 22,
      "type": "prediction",
      "prediction": "no_goal",
      "outcome": "correct",
      "points": 50,
      "xgAtMoment": 0.18,
      "player": "saka"
    }
  ]
}
```

### /matches/{matchId}
```json
{
  "matchId": "afc_cfc_oct14_2025",
  "competition": "premier_league",
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "kickoffTime": 1729000000000,
  "venue": "Emirates Stadium",
  "status": "live",
  "minute": 67,
  "homeScore": 2,
  "awayScore": 1,
  "homeXg": 2.34,
  "awayXg": 0.87,
  "activeFans": 142847,
  "lastEventId": "evt_04821"
}
```

### /matches/{matchId}/moments/{momentId}
```json
{
  "momentId": "evt_04821",
  "type": "big_chance",
  "minute": 67,
  "second": 14,
  "confidence": 0.91,
  "playerId": "saka",
  "teamId": "arsenal",
  "xgValue": 0.51,
  "playerX": 4523,
  "playerY": 3210,
  "timestamp": 1729004821000,
  "interactionFired": "prediction_card",
  "fanResponseCount": 14203,
  "yesVotes": 8921,
  "noVotes": 5282,
  "resolved": true,
  "resolution": "no_goal"
}
```

### /watchParties/{partyId}
```json
{
  "partyId": "party_james_group",
  "matchId": "afc_cfc_oct14_2025",
  "members": ["fanId_1", "fanId_2", "fanId_3"],
  "createdBy": "fanId_1",
  "groupEmotionState": "tense",
  "groupEmotionIntensity": 0.87,
  "lastUpdated": 1729004900000
}
```

### /fanTwins/{fanId}
```json
{
  "fanId": "james_kumar",
  "matchesAnalysed": 23,
  "lastUpdated": "2025-11-01",
  "profile": {
    "decisionStyle": "instinct",
    "tacticalPreference": "high_press",
    "riskTolerance": 0.72,
    "setpieceAccuracy": 0.78,
    "openPlayAccuracy": 0.61,
    "penaltyAccuracy": 0.45,
    "overratedPlayers": ["saka_big_games"],
    "underratedPlayers": ["white_defensive"],
    "peakEmotionTriggers": ["late_goals", "var_decisions"]
  },
  "seasonSummary": {
    "totalPredictions": 187,
    "overallAccuracy": 0.64,
    "bestMatch": "afc_mci_feb2026",
    "worstMatch": "afc_che_oct2025"
  }
}
```

---

## Realtime Database Structure (for low-latency during match)

```json
{
  "liveMatches": {
    "afc_cfc_oct14_2025": {
      "minute": 67,
      "homeScore": 2,
      "awayScore": 1,
      "activeFans": 142847,
      "currentMoment": "prediction_card",
      "momentExpiresAt": 1729004829000
    }
  },
  "fanSessions": {
    "james_kumar": {
      "online": true,
      "lastTap": 1729004800000,
      "passiveMode": false,
      "matchId": "afc_cfc_oct14_2025"
    }
  }
}
```

---

## Security Rules (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fans/{fanId} {
      allow read, write: if request.auth.uid == fanId;
    }
    match /fans/{fanId}/matchHistory/{matchId} {
      allow read: if request.auth.uid == fanId;
      allow write: if false; // Server-side only via Cloud Functions
    }
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if false; // Server-side only
    }
    match /fanTwins/{fanId} {
      allow read: if request.auth.uid == fanId;
      allow write: if false; // Server-side only
    }
  }
}
```
