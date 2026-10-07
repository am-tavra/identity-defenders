-- =============================================================================
-- Identity Defender: lock down client access; add server-issued game sessions
-- and analytics events. Brings this project in line with Credential Command
-- and Voidhawk: Turnaround.
--
-- After this migration the browser (anon key) can only READ:
--   competitions (active), leaderboard_top, competition_standings.
-- All writes (players, scores, leads, competition entries, sessions, events)
-- go through Next.js API routes using the service role.
--
-- Run in the Supabase SQL editor for project jkisqvocmcoureqdzpvm, or
-- `supabase link` + `supabase db push`. Deploy the matching app build AFTER
-- this has run: the old build writes directly from the browser and will stop
-- saving scores the moment the policies below are dropped.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. REMOVE DIRECT CLIENT ACCESS TO PLAYER DATA
--    The phase 1/2 policy names are not in this repo, so drop whatever exists.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('players', 'scores', 'leads', 'competition_entries')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON players, scores, leads, competition_entries FROM anon, authenticated;
REVOKE ALL ON competition_leaderboard FROM anon, authenticated;  -- has real names; admin-only now

-- RLS enabled with no policies = deny for anon/authenticated. Service role bypasses RLS.


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PUBLIC READ-ONLY VIEWS (no tokens, emails or real names)
--    These run with the view owner's rights on purpose and expose only the
--    listed columns.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW leaderboard_top AS
SELECT
  s.id,
  s.name,
  s.score,
  s.wave,
  s.created_at,
  p.streak_days,
  p.total_plays
FROM scores s
JOIN players p ON p.id = s.player_id;

-- competition_leaderboard was created security_invoker in the phase 3 migration, which would make
-- it check the anon caller against the now-locked tables. Run it with the owner's rights; anon
-- still has no grant on competition_leaderboard itself, so first/last names stay admin-only.
ALTER VIEW competition_leaderboard SET (security_invoker = false);

CREATE OR REPLACE VIEW competition_standings AS
SELECT competition_id, player_id, handle, best_score, scores_count, current_rank, rank_delta, new_today
FROM competition_leaderboard;

GRANT SELECT ON leaderboard_top, competition_standings TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GAME SESSIONS: issued by the server when a game starts; a score must
--    reference an unused session that has been running long enough.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_token text NOT NULL,
  ip_hash      text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score_id     uuid REFERENCES scores(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS game_sessions_token_idx ON game_sessions (player_token, started_at DESC);
CREATE INDEX IF NOT EXISTS game_sessions_ip_idx    ON game_sessions (ip_hash, started_at DESC);
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;  -- service role only

ALTER TABLE scores ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES game_sessions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS scores_session_unique ON scores (session_id) WHERE session_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ANALYTICS EVENTS (written by /api routes, read by the admin portal)
--    Identity Defender counts quarters, so the per-wave event is quarter_end.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL CHECK (name IN (
                 'page_view', 'game_start', 'quarter_end', 'game_over',
                 'score_saved', 'email_captured', 'share', 'competition_entry'
               )),
  player_token text,
  session_id   uuid,
  props        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_name_time_idx ON events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS events_time_idx      ON events (created_at DESC);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;  -- service role only

REVOKE ALL ON game_sessions, events FROM anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VERIFY
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
--   → nothing for players / scores / leads / competition_entries
-- SELECT viewname FROM pg_views WHERE schemaname = 'public';
--   → competition_leaderboard, competition_standings, leaderboard_top
