import { type NextRequest, NextResponse } from 'next/server'
import { UUID, EMAIL, bad, db, readJson, findPlayer, logEvent } from '@/lib/server/game'

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (!body) return bad('invalid body')
  const token = String(body.token ?? '')
  const competitionId = String(body.competitionId ?? '')
  const firstName = text(body.firstName, 60), lastName = text(body.lastName, 60)
  const email = text(body.email, 254).toLowerCase()
  const linkedin = text(body.linkedinUrl, 300)
  if (!UUID.test(token) || !UUID.test(competitionId)) return bad('invalid request')
  if (!firstName || !lastName) return bad('first and last name are required')
  if (!EMAIL.test(email)) return bad('enter a valid email')
  if (linkedin && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(linkedin)) return bad('LinkedIn URL should start with https://linkedin.com/')

  const sb = db()
  const player = await findPlayer(token)
  if (!player) return bad('play a game and save your score first', 403)
  const now = new Date().toISOString()
  const { data: comp } = await sb.from('competitions').select('id').eq('id', competitionId)
    .eq('active', true).lte('starts_at', now).gte('ends_at', now).maybeSingle()
  if (!comp) return bad('this competition is not open', 404)

  const { error } = await sb.from('competition_entries').insert({
    competition_id: competitionId, player_id: player.id,
    first_name: firstName, last_name: lastName, email, linkedin_url: linkedin || null,
  })
  if (error) return bad(error.code === '23505' ? 'you are already entered' : 'could not enter', error.code === '23505' ? 409 : 500)
  await logEvent('competition_entry', token, null, { competitionId })
  return NextResponse.json({ ok: true })
}
