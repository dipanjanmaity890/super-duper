-- Fan Pulse: Live Sports Engagement Platform
-- Full Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- USERS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(50)  UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  avatar_initials CHAR(2),
  avatar_color    VARCHAR(20)  DEFAULT 'teal',
  total_points    INTEGER      DEFAULT 0,
  streak_count    INTEGER      DEFAULT 0,
  is_admin        BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TEAMS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  short_code   VARCHAR(5)   NOT NULL,
  badge_color  VARCHAR(20)  DEFAULT 'teal',
  city         VARCHAR(100),
  country      VARCHAR(100),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- MATCHES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  home_score     INTEGER      DEFAULT 0,
  away_score     INTEGER      DEFAULT 0,
  status         VARCHAR(20)  DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','live','halftime','finished','cancelled')),
  match_minute   INTEGER      DEFAULT 0,
  added_time     INTEGER      DEFAULT 0,
  scheduled_at   TIMESTAMPTZ  NOT NULL,
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  venue          VARCHAR(255),
  competition    VARCHAR(100),
  season         VARCHAR(20),
  active_poll_id UUID,          -- FK added after polls table
  active_event_id UUID,         -- FK added after match_events table
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- MATCH EVENTS  (goals, cards, subs, etc.)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL
                  CHECK (event_type IN (
                    'kickoff','goal','own_goal','yellow_card','red_card',
                    'substitution','penalty_awarded','penalty_scored',
                    'penalty_missed','save','var_check','corner',
                    'halftime','fulltime','injury'
                  )),
  minute        INTEGER     NOT NULL,
  added_time    INTEGER     DEFAULT 0,
  team_id       UUID        REFERENCES teams(id),
  player_name   VARCHAR(100),
  assist_name   VARCHAR(100),
  description   TEXT,
  is_key_moment BOOLEAN     DEFAULT FALSE,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- back-fill FK on matches
ALTER TABLE matches ADD CONSTRAINT fk_active_event
  FOREIGN KEY (active_event_id) REFERENCES match_events(id) DEFERRABLE INITIALLY DEFERRED;

-- ──────────────────────────────────────────────
-- MATCH STATS  (one row per team per match, upserted live)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_stats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id          UUID REFERENCES teams(id),
  possession       NUMERIC(5,2) DEFAULT 50.0,
  shots            INTEGER      DEFAULT 0,
  shots_on_target  INTEGER      DEFAULT 0,
  passes           INTEGER      DEFAULT 0,
  pass_accuracy    NUMERIC(5,2) DEFAULT 0,
  corners          INTEGER      DEFAULT 0,
  fouls            INTEGER      DEFAULT 0,
  yellow_cards     INTEGER      DEFAULT 0,
  red_cards        INTEGER      DEFAULT 0,
  offsides         INTEGER      DEFAULT 0,
  xg               NUMERIC(5,2) DEFAULT 0,
  momentum         NUMERIC(5,2) DEFAULT 50.0,
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (match_id, team_id)
);

-- ──────────────────────────────────────────────
-- POLLS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID REFERENCES matches(id) ON DELETE CASCADE,
  match_event_id   UUID REFERENCES match_events(id) ON DELETE SET NULL,
  question         TEXT        NOT NULL,
  poll_type        VARCHAR(20) DEFAULT 'general'
                     CHECK (poll_type IN ('general','player_rating','outcome','moment')),
  status           VARCHAR(20) DEFAULT 'active'
                     CHECK (status IN ('active','closed','resolved')),
  points_reward    INTEGER     DEFAULT 10,
  closes_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ADD CONSTRAINT fk_active_poll
  FOREIGN KEY (active_poll_id) REFERENCES polls(id) DEFERRABLE INITIALLY DEFERRED;

-- ──────────────────────────────────────────────
-- POLL OPTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text   VARCHAR(200) NOT NULL,
  display_order INTEGER      DEFAULT 0,
  is_correct    BOOLEAN,          -- set when resolved
  vote_count    INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- POLL VOTES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID REFERENCES polls(id)         ON DELETE CASCADE,
  poll_option_id  UUID REFERENCES poll_options(id)  ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id)         ON DELETE CASCADE,
  points_earned   INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

-- ──────────────────────────────────────────────
-- PREDICTIONS  (higher-stakes single-question bets)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID REFERENCES matches(id)       ON DELETE CASCADE,
  match_event_id   UUID REFERENCES match_events(id)  ON DELETE SET NULL,
  user_id          UUID REFERENCES users(id)         ON DELETE CASCADE,
  prediction_type  VARCHAR(40) NOT NULL,
  prediction_value VARCHAR(100) NOT NULL,
  points_reward    INTEGER     DEFAULT 50,
  is_correct       BOOLEAN,
  is_resolved      BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_event_id, user_id, prediction_type)
);

-- ──────────────────────────────────────────────
-- REACTIONS  (per event, per user)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID REFERENCES matches(id)       ON DELETE CASCADE,
  match_event_id  UUID REFERENCES match_events(id)  ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id)         ON DELETE CASCADE,
  reaction_type   VARCHAR(20) NOT NULL
                    CHECK (reaction_type IN ('fire','shock','target','angry','chat')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated counts for fast reads
CREATE TABLE IF NOT EXISTS reaction_counts (
  match_event_id  UUID REFERENCES match_events(id) ON DELETE CASCADE,
  reaction_type   VARCHAR(20),
  count           INTEGER DEFAULT 0,
  PRIMARY KEY (match_event_id, reaction_type)
);

-- ──────────────────────────────────────────────
-- FAN FEED POSTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_feed_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     UUID REFERENCES matches(id)  ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id)    ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  post_type    VARCHAR(30) DEFAULT 'comment'
                 CHECK (post_type IN (
                   'comment','prediction_win','reaction','achievement','hot_take'
                 )),
  points_earned  INTEGER   DEFAULT 0,
  is_featured    BOOLEAN   DEFAULT FALSE,
  likes_count    INTEGER   DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- POINTS LOG  (full audit trail)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id)    ON DELETE CASCADE,
  match_id     UUID REFERENCES matches(id)  ON DELETE SET NULL,
  action_type  VARCHAR(40) NOT NULL,
  points       INTEGER     NOT NULL,
  description  VARCHAR(255),
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- MATCH LEADERBOARD
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_leaderboard (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID REFERENCES matches(id)  ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id)    ON DELETE CASCADE,
  points     INTEGER     DEFAULT 0,
  rank       INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_match_events_match    ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_type     ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_polls_match           ON polls(match_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user       ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match     ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user      ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_event       ON reactions(match_event_id);
CREATE INDEX IF NOT EXISTS idx_fan_feed_match        ON fan_feed_posts(match_id);
CREATE INDEX IF NOT EXISTS idx_fan_feed_created      ON fan_feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_log_user       ON points_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_match_pts ON match_leaderboard(match_id, points DESC);

-- ──────────────────────────────────────────────
-- SEED DATA – 6 teams, 3 matches
-- ──────────────────────────────────────────────
INSERT INTO teams (id, name, short_code, badge_color, city, country) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Manchester FC',  'MCF', 'teal',   'Manchester', 'England'),
  ('11111111-0000-0000-0000-000000000002', 'Arsenal North',  'ARN', 'coral',  'London',     'England'),
  ('11111111-0000-0000-0000-000000000003', 'Chelsea Blue',   'CHE', 'blue',   'London',     'England'),
  ('11111111-0000-0000-0000-000000000004', 'Liverpool Red',  'LIV', 'coral',  'Liverpool',  'England'),
  ('11111111-0000-0000-0000-000000000005', 'Tottenham White','TOT', 'purple', 'London',     'England'),
  ('11111111-0000-0000-0000-000000000006', 'Leicester Fox',  'LEI', 'blue',   'Leicester',  'England')
ON CONFLICT DO NOTHING;

-- Match 1: MCF vs ARN  (seed starts as scheduled; seed.js upgrades to live)
INSERT INTO matches (id, home_team_id, away_team_id, status, scheduled_at, venue, competition, season)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002',
  'scheduled', NOW(), 'Etihad Stadium', 'Premier League', '2025/26'
) ON CONFLICT DO NOTHING;

-- Match 2: CHE vs LIV  (upcoming)
INSERT INTO matches (id, home_team_id, away_team_id, status, scheduled_at, venue, competition, season)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000004',
  'scheduled', NOW() + INTERVAL '3 hours', 'Stamford Bridge', 'Premier League', '2025/26'
) ON CONFLICT DO NOTHING;

-- Match 3: TOT vs LEI  (finished)
INSERT INTO matches (id, home_team_id, away_team_id, status, scheduled_at, venue, competition, season,
                     started_at, ended_at, home_score, away_score, match_minute)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000006',
  'finished', NOW() - INTERVAL '3 hours', 'Tottenham Hotspur Stadium', 'Premier League', '2025/26',
  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 2, 1, 90
) ON CONFLICT DO NOTHING;

-- Match stats
INSERT INTO match_stats (match_id, team_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000005'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- Finished match stats (TOT 2-1 LEI)
UPDATE match_stats SET possession=58, shots=14, shots_on_target=6, passes=490, corners=7, fouls=9, xg=2.31
  WHERE match_id='aaaaaaaa-0000-0000-0000-000000000003' AND team_id='11111111-0000-0000-0000-000000000005';
UPDATE match_stats SET possession=42, shots=9, shots_on_target=3, passes=362, corners=4, fouls=11, xg=1.14
  WHERE match_id='aaaaaaaa-0000-0000-0000-000000000003' AND team_id='11111111-0000-0000-0000-000000000006';
