import { type NextRequest, NextResponse } from 'next/server'
import { UUID, bad, db, findPlayer, publicPlayer } from '@/lib/server/game'

// The caller's own player record (by their browser token) and the competitions they've entered.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!UUID.test(token)) return bad('invalid token')
  const player = await findPlayer(token)
  let enteredCompetitionIds: string[] = []
  if (player) {
    const { data } = await db().from('competition_entries').select('competition_id').eq('player_id', player.id)
    enteredCompetitionIds = (data ?? []).map(r => r.competition_id as string)
  }
  return NextResponse.json({ player: publicPlayer(player), enteredCompetitionIds })
}
