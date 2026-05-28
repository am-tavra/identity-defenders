-- =============================================================================
-- Identity Defender — Phase 3 Schema Migration
-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/jkisqvocmcoureqdzpvm/sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND EXISTING TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Add unique handle + email to players (the permanent identity)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS handle     text,
  ADD COLUMN IF NOT EXISTS email      text;

-- Back-fill handle from existing name column so old rows aren't null
UPDATE players SET handle = UPPER(TRIM(name)) WHERE handle IS NULL AND name IS NOT NULL;

-- Now enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS players_handle_unique ON players (handle)
  WHERE handle IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_email_unique  ON players (email)
  WHERE email IS NOT NULL;

-- Add referral tracking to scores
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS referred_by_score_id uuid REFERENCES scores(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NEW TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin users (Supabase Auth users granted admin access)
CREATE TABLE IF NOT EXISTS admin_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  email      text,
  role       text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Competitions
CREATE TABLE IF NOT EXISTS competitions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  prize_description text,
  banner_text       text,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  active            boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_active_competition EXCLUDE USING gist (
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (active = true)
);

-- Competition entries (player registration for a competition)
CREATE TABLE IF NOT EXISTS competition_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id      uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  email          text NOT NULL,
  linkedin_url   text,
  disqualified   boolean NOT NULL DEFAULT false,
  entered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, player_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEADERBOARD VIEW WITH RANK DELTA
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop and recreate so it stays current
DROP VIEW IF EXISTS competition_leaderboard;

CREATE VIEW competition_leaderboard
WITH (security_invoker = true)
AS
WITH competition_scores AS (
  -- Best score per registered player during the competition window
  SELECT
    ce.competition_id,
    ce.player_id,
    ce.first_name,
    ce.last_name,
    ce.disqualified,
    COALESCE(p.handle, p.name, 'ANON') AS handle,
    MAX(s.score)                        AS best_score,
    COUNT(s.id)                         AS scores_count,
    -- Yesterday's best (scores submitted before today midnight UTC)
    MAX(s.score) FILTER (
      WHERE s.created_at < date_trunc('day', now() AT TIME ZONE 'UTC')
    ) AS yesterday_best
  FROM competition_entries ce
  JOIN players p ON p.id = ce.player_id
  JOIN competitions c ON c.id = ce.competition_id
  JOIN scores s
    ON s.player_id = ce.player_id
   AND s.created_at BETWEEN c.starts_at AND c.ends_at
  WHERE ce.disqualified = false
  GROUP BY
    ce.competition_id, ce.player_id,
    ce.first_name, ce.last_name, ce.disqualified,
    p.handle, p.name
),
ranked AS (
  SELECT
    *,
    RANK() OVER (
      PARTITION BY competition_id
      ORDER BY best_score DESC, scores_count DESC
    ) AS current_rank,
    RANK() OVER (
      PARTITION BY competition_id
      ORDER BY COALESCE(yesterday_best, -1) DESC, scores_count DESC
    ) AS yesterday_rank
  FROM competition_scores
)
SELECT
  competition_id,
  player_id,
  handle,
  first_name,
  last_name,
  best_score,
  scores_count,
  current_rank,
  -- Positive = moved up, negative = moved down, NULL = new today
  CASE
    WHEN yesterday_best IS NULL THEN NULL
    ELSE (yesterday_rank - current_rank)::int
  END AS rank_delta,
  yesterday_best IS NULL AS new_today
FROM ranked;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

-- ── admin_users ──
-- Only authenticated admins can see the admin_users table.
-- No public access at all — reads go through API routes with service role.
CREATE POLICY "admin_users: service role only"
  ON admin_users FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── competitions ──
-- Public can read active competitions (for the in-game banner).
-- Writes are service-role-only (via admin API routes).
CREATE POLICY "competitions: public read active"
  ON competitions FOR SELECT
  USING (active = true);

CREATE POLICY "competitions: no direct write"
  ON competitions FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── competition_entries ──
-- Players can insert their own entry (anon key, player_id matches their token lookup).
-- Players can read competition entries (for leaderboard counts, their own entry).
-- Writes other than own insert go through service role.
CREATE POLICY "competition_entries: public read"
  ON competition_entries FOR SELECT
  USING (true);

CREATE POLICY "competition_entries: insert own"
  ON competition_entries FOR INSERT
  WITH CHECK (true);  -- player_id validation happens in app layer

CREATE POLICY "competition_entries: no direct update/delete"
  ON competition_entries FOR UPDATE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. GRANT TABLE ACCESS TO ANON + AUTHENTICATED ROLES
-- ─────────────────────────────────────────────────────────────────────────────

-- competitions: anon can read (for banner fetch)
GRANT SELECT ON competitions TO anon, authenticated;

-- competition_entries: anon can read + insert (for signup + leaderboard)
GRANT SELECT, INSERT ON competition_entries TO anon, authenticated;

-- admin_users: no public grants — service role only
-- (no GRANT needed; service role bypasses RLS)

-- Install btree_gist extension (needed for the overlap EXCLUDE constraint)
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VERIFY
-- ─────────────────────────────────────────────────────────────────────────────
-- After running, confirm with:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
--
--   SELECT viewname FROM pg_views WHERE schemaname = 'public';
