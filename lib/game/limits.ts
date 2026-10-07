// Server-side plausibility limits for submitted scores, derived from the wave tuning in
// engine.ts and constants.ts so they stay correct when the game is rebalanced.
// Deliberately generous: they stop forged scores, not good players.
import { ENEMY } from './constants'

const MARGIN = 1.5

// Formation per quarter (engine.buildWave): 4 Rogue AI Agents, 6 Rogue NHIs, 16 Compromised
// Credentials, and 10 Shadow IT drones per blue row (2 rows for quarters 1-3, then 1).
function formationCeiling(q: number): number {
  const blueRows = Math.max(1, 2 - Math.floor((q - 1) / 3))
  const agents = 4 * 800                      // every flagship as a full escort combo
  const nhis = 6 * ENEMY.NHI.divePts
  const creds = 16 * ENEMY.CRED.divePts
  const drones = 10 * blueRows * ENEMY.DRONE.divePts
  const quarterEnd = 5 * 100                  // lives bonus at the quarter transition, max 5 lives
  return agents + nhis + creds + drones + quarterEnd
}

// A Scattered Spider raid fires on quarter 4 and every 4th quarter after: 5 spiders plus up to
// 8 reinforcements, and a 2000 bonus for containing it.
function raidCeiling(q: number): number {
  if (q < 4 || (q - 4) % 4 !== 0) return 0
  return 13 * ENEMY.SCATTERED.divePts + 2000
}

// LOTL impostors spawn on a timer (every 220-360 frames, ~55% of specials) for as long as a
// quarter lasts, so the ceiling also grows with real time played: at most one 300-point catch
// per ~3.7 s, doubled while Observability Boost is active.
const LOTL_PTS_PER_SECOND = 300 / 3.7 * 2

export function maxScoreFor(quarter: number, elapsedSeconds: number): number {
  let total = 0
  for (let q = 1; q <= quarter; q++) total += formationCeiling(q) + raidCeiling(q)
  // Observability Boost doubles enemy points for 15 s at a time; allow for it being up often
  total *= 2
  total += Math.max(0, elapsedSeconds) * LOTL_PTS_PER_SECOND
  return Math.ceil(total * MARGIN)
}

// Fewest real seconds a game reaching `quarter` can take. The warmup needs five targets hit,
// each quarter needs 46-56 formation enemies cleared one bullet at a time, and the transition
// between quarters is 2 s. Deliberately low.
export function minSecondsFor(quarter: number): number {
  return 5 + (quarter - 1) * 12
}
