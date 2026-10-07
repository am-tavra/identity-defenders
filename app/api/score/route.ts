import { type NextRequest, NextResponse } from 'next/server'
import { UUID, EMAIL, bad, db, readJson, cleanHandle, findPlayer, logEvent, publicPlayer } from '@/lib/server/game'
import { maxScoreFor, minSecondsFor } from '@/lib/game/limits'

const PER_TOKEN_PER_HOUR = 20
const MAX_QUARTER = 99  // the game is endless; the scores.wave check constraint caps it in the database

// Save a finished game. The score must belong to an unused session that ran long enough,
// and must be achievable for the quarters played in the time played.
export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (!body) return bad('invalid body')
  const token = String(body.token ?? '')
  const sessionId = String(body.sessionId ?? '')
  const score = Number(body.score)
  const quarter = Number(body.quarter)
  const name = cleanHandle(body.name)
  const email = String(body.email ?? '').trim().toLowerCase()
  const referredBy = String(body.referredBy ?? '')

  if (!UUID.test(token) || !UUID.test(sessionId)) return bad('invalid token or session')
  if (!Number.isInteger(score) || score < 0) return bad('invalid score')
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > MAX_QUARTER) return bad('invalid quarter')
  if (email && !EMAIL.test(email)) return bad('invalid email')

  const sb = db()
  const { data: session } = await sb.from('game_sessions').select('*').eq('id', sessionId).maybeSingle()
  if (!session || session.player_token !== token) return bad('unknown session', 403)
  if (session.submitted_at) return bad('score already saved for this game', 409)
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000
  if (elapsed < minSecondsFor(quarter)) return bad('game too short for that quarter', 422)
  if (score > maxScoreFor(quarter, elapsed)) return bad('score not achievable', 422)

  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count: recent } = await sb.from('game_sessions').select('id', { count: 'exact', head: true })
    .eq('player_token', token).not('submitted_at', 'is', null).gte('submitted_at', since)
  if ((recent ?? 0) >= PER_TOKEN_PER_HOUR) return bad('too many scores, try again later', 429)

  // upsert the player, tracking daily streaks
  const existing = await findPlayer(token)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
  let streak = 1
  if (existing?.last_played_date === today) streak = existing.streak_days || 1
  else if (existing?.last_played_date === yesterday) streak = (existing.streak_days || 0) + 1
  const fields = {
    name, streak_days: streak, last_played_date: today,
    best_score: Math.max(existing?.best_score || 0, score),
    total_plays: (existing?.total_plays || 0) + 1,
  }
  const { data: player, error: pErr } = existing
    ? await sb.from('players').update(fields).eq('id', existing.id).select('*').single()
    : await sb.from('players').insert({ token, ...fields }).select('*').single()
  if (pErr || !player) return bad('could not save player', 500)

  const { data: row, error: sErr } = await sb.from('scores').insert({
    player_id: player.id, name, score, wave: quarter, session_id: sessionId,
    referred_by_score_id: UUID.test(referredBy) ? referredBy : null,
  }).select('id').single()
  if (sErr || !row) return bad('could not save score', 500)

  await sb.from('game_sessions').update({ submitted_at: new Date().toISOString(), score_id: row.id }).eq('id', sessionId)
  await logEvent('score_saved', token, sessionId, { score, quarter, name, firstSave: !existing })
  if (email) {
    await sb.from('leads').insert({ player_id: player.id, email, source: 'score_save' })
    await logEvent('email_captured', token, sessionId)
  }
  return NextResponse.json({ scoreId: row.id, player: publicPlayer(player) })
}
