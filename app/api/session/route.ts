import { type NextRequest, NextResponse } from 'next/server'
import { UUID, bad, db, ipHash, readJson, logEvent } from '@/lib/server/game'

const PER_IP_PER_HOUR = 60
const PER_TOKEN_PER_HOUR = 30

// Start a game: returns a session id the score submission must reference.
export async function POST(req: NextRequest) {
  const body = await readJson(req)
  const token = String(body?.token ?? '')
  if (!UUID.test(token)) return bad('invalid token')

  const ip = ipHash(req)
  const since = new Date(Date.now() - 3600_000).toISOString()
  const sb = db()
  const [{ count: byIp }, { count: byToken }] = await Promise.all([
    sb.from('game_sessions').select('id', { count: 'exact', head: true }).eq('ip_hash', ip).gte('started_at', since),
    sb.from('game_sessions').select('id', { count: 'exact', head: true }).eq('player_token', token).gte('started_at', since),
  ])
  if ((byIp ?? 0) >= PER_IP_PER_HOUR || (byToken ?? 0) >= PER_TOKEN_PER_HOUR) return bad('too many games, try again later', 429)

  const { data, error } = await sb.from('game_sessions').insert({ player_token: token, ip_hash: ip }).select('id').single()
  if (error || !data) return bad('could not start session', 500)
  await logEvent('game_start', token, data.id, { mobile: body?.mobile === true }, req)
  return NextResponse.json({ sessionId: data.id })
}
