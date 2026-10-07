# Identity Defender

A Galaga-style fixed shooter about identity security. **Hackers don't hack in. They log in.**

Shadow IT, compromised credentials, rogue NHIs and rogue AI agents hold formation above the
identity perimeter; LOTL impostors drift down disguised as sanctioned users; Scattered Spider
raids hit every fourth quarter. Shoot threats, read intent, and never shoot a sanctioned user.
The game is endless: quarters keep coming until the sentinel is lost.

Built on the same shell as Credential Command and Voidhawk: Turnaround: Next.js 16 + Supabase,
with competitions, a global leaderboard, shareable score pages (`/s/[scoreId]`), OG images,
analytics, and an admin portal. Part of [Threat Arcade](https://threatarcade.com).

## Layout

| Path | What |
|---|---|
| `lib/game/constants.ts` | Enemies, power-ups, points, warmup systems |
| `lib/game/engine.ts` | Simulation: formation, dives, LOTL, raids, power-ups, collisions |
| `lib/game/renderer.ts` | Canvas drawing (640×720 logical) |
| `lib/game/limits.ts` | Server-side score ceilings, derived from the wave tuning |
| `lib/server/` | Service-role helpers for the API routes and the admin analytics |
| `hooks/useGameLoop.ts` | rAF loop, keyboard + touch input, game sessions and events |
| `components/game/` | React overlays: title, pause, game over, HUD, legend, touch controls |
| `app/api/` | Public game API (session, score, events, player, competition entry) and admin routes |
| `app/admin/` | Admin portal (dashboard, competitions, players, analytics) |
| `supabase/migrations/` | Schema changes, in order |

## Data flow

The browser never writes to Supabase directly. With the anon key it can only read the active
competition and two public views (`leaderboard_top`, `competition_standings`), which carry no
tokens, emails or real names.

1. Starting a game calls `POST /api/session`, which issues a session id and logs `game_start`
   with device and approximate location.
2. Clearing a quarter logs `quarter_end`; losing the sentinel logs `game_over`.
3. Saving a score calls `POST /api/score` with the session id. The server rejects scores
   whose session is already used, ran too briefly for the quarter claimed, or exceeds the
   ceiling in `lib/game/limits.ts` for that quarter and time played. It then upserts the
   player (streaks), inserts the score, and logs `score_saved` and `email_captured`.
4. Shares log `share` with the channel; competition entries go through
   `POST /api/competition/enter` and log `competition_entry`.

The admin Analytics page aggregates those events: visitors, games started, average quarter
reached, average score, named-play rate, emails, shares, competition entries, a player
funnel, games per day, where games ended, locations, and a per-play log.

## Setup

1. Create a Supabase project and run the migrations in `supabase/migrations/` in order
   (SQL editor, or `supabase link` + `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill in the project URL, anon key and service role
   key. `IP_HASH_SALT` is optional.
3. Add an admin: create a user in Supabase Auth, then
   `insert into admin_users (user_id, email, role) values ('<auth user id>', '<email>', 'owner');`
4. `npm install && npm run dev`, then open http://localhost:3000.

With no Supabase env vars the game is fully playable; scores, the leaderboard, competitions
and analytics are switched off.

## Controls

← → move · Space fire · P pause · Enter start / retry. On touch devices the on-screen controls appear during play.
