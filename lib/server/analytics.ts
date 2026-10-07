// Aggregates the events table for the admin Analytics page.
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

export type Range = '7d' | '30d' | 'all'
export const RANGES: Record<Range, { label: string; days: number | null }> = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  all: { label: 'All time', days: null },
}

interface Ev { name: string; player_token: string | null; session_id: string | null; props: Record<string, unknown>; created_at: string }

async function loadEvents(since: string | null): Promise<Ev[]> {
  const sb = createServiceClient()
  const out: Ev[] = []
  const PAGE = 1000
  for (let from = 0; from < 100_000; from += PAGE) {
    let q = sb.from('events').select('name, player_token, session_id, props, created_at')
      .order('created_at', { ascending: true }).range(from, from + PAGE - 1)
    if (since) q = q.gte('created_at', since)
    const { data } = await q
    if (!data?.length) break
    out.push(...(data as Ev[]))
    if (data.length < PAGE) break
  }
  return out
}

// "Baltimore, MD" in the US, "London, United Kingdom" elsewhere (region codes outside the US are opaque)
type Geo = { country?: string; region?: string; city?: string }
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
export const countryName = (code: string) => { try { return countryNames.of(code) ?? code } catch { return code } }
const geoOfEv = (e: { props: Record<string, unknown> }) => {
  const g = e.props?.geo as Geo | undefined
  return g?.country ? g : null
}
export function placeLabel(g: Geo | null): string | null {
  if (!g?.country) return null
  const where = g.country === 'US' ? g.region : countryName(g.country)
  return g.city ? [g.city, where].filter(Boolean).join(', ') : countryName(g.country)
}

const tokensWhere = (evs: Ev[], pred: (e: Ev) => boolean) =>
  new Set(evs.filter(pred).map(e => e.player_token).filter(Boolean)).size

// Identity Defender is endless: a game ends when the sentinel is lost, never by "finishing".
// So the headline is how far players get (quarters reached), not a completion rate.
export async function getAnalytics(range: Range) {
  const days = RANGES[range].days
  const since = days ? new Date(Date.now() - days * 86400_000).toISOString() : null
  const evs = await loadEvents(since)
  const is = (n: string) => (e: Ev) => e.name === n
  const q = (e: Ev) => Number(e.props?.quarter ?? 0)

  const starts = evs.filter(is('game_start')).length
  const overs = evs.filter(is('game_over'))
  const pageViews = evs.filter(is('page_view'))
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null
  const avg1 = (xs: number[]) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null

  const funnel = [
    { label: 'Visited', value: tokensWhere(evs, is('page_view')) },
    { label: 'Started a game', value: tokensWhere(evs, is('game_start')) },
    { label: 'Reached Q2', value: tokensWhere(evs, e => e.name === 'quarter_end' && q(e) >= 1) },
    { label: 'Reached Q4', value: tokensWhere(evs, e => e.name === 'quarter_end' && q(e) >= 3) },
    { label: 'Survived a raid', value: tokensWhere(evs, e => e.name === 'quarter_end' && q(e) >= 4) },
    { label: 'Saved a score', value: tokensWhere(evs, is('score_saved')) },
    { label: 'Shared', value: tokensWhere(evs, is('share')) },
  ]

  // games started per UTC day, oldest first
  const span = days ?? 30
  const daily: { day: string; value: number }[] = []
  for (let i = span - 1; i >= 0; i--) daily.push({ day: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), value: 0 })
  const byDay = new Map(daily.map(d => [d.day, d]))
  evs.filter(is('game_start')).forEach(e => { const d = byDay.get(e.created_at.slice(0, 10)); if (d) d.value++ })

  const count = <T extends string>(xs: T[]) => {
    const m = new Map<T, number>()
    xs.forEach(x => m.set(x, (m.get(x) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }

  // one location per player: the latest one seen in range
  const geoByPlayer = new Map<string, Geo>()
  evs.forEach(e => { const g = geoOfEv(e); if (g && e.player_token) geoByPlayer.set(e.player_token, g) })
  const places = [...geoByPlayer.values()]

  return {
    range, since,
    countries: count(places.map(g => countryName(g.country!))).slice(0, 10),
    cities: count(places.filter(g => g.city).map(g => placeLabel(g)!)).slice(0, 10),
    locatedPlayers: places.length,
    tiles: {
      visitors: funnel[0].value,
      gamesStarted: starts,
      avgQuarter: avg1(overs.map(e => Math.max(1, q(e)))),
      reachedQ4Rate: starts ? Math.round(funnel[3].value / Math.max(1, funnel[1].value) * 100) : null,
      avgScore: avg(overs.map(e => Number(e.props?.score ?? 0))),
      scoresSaved: evs.filter(is('score_saved')).length,
      emails: evs.filter(is('email_captured')).length,
      shares: evs.filter(is('share')).length,
      entries: evs.filter(is('competition_entry')).length,
      mobileShare: pageViews.length ? Math.round(pageViews.filter(e => e.props?.mobile === true).length / pageViews.length * 100) : null,
    },
    funnel,
    daily,
    shares: count(evs.filter(is('share')).map(e => String(e.props?.channel ?? 'unknown'))),
    referrers: count(pageViews.map(e => String(e.props?.referrer ?? 'direct'))).slice(0, 8),
    quitQuarter: count(overs.map(e => `Q${Math.max(1, q(e))}`)),
  }
}

// ── Per-play log ──

export type NameStatus = 'new name' | 'returning' | 'anonymous' | 'save failed'
export interface Play {
  id: string
  startedAt: string
  player: string          // saved handle, or "Anonymous"
  playerKey: string       // short stable id for the browser, to spot repeat players
  device: 'Mobile' | 'Desktop' | '—'
  location: string | null
  reached: number         // highest quarter reached
  score: number | null
  status: 'over' | 'playing' | 'abandoned'
  name: NameStatus | null // null while the game is still running / abandoned
  shared: string[]
}

export async function getPlays(range: Range, limit = 100): Promise<{ plays: Play[]; namedRate: number | null }> {
  const sb = createServiceClient()
  const days = RANGES[range].days
  let q = sb.from('game_sessions').select('id, player_token, started_at, submitted_at, scores!game_sessions_score_id_fkey(name)')
    .order('started_at', { ascending: false }).limit(limit)
  if (days) q = q.gte('started_at', new Date(Date.now() - days * 86400_000).toISOString())
  const { data: sessions, error } = await q
  if (error) throw new Error(`plays query failed: ${error.message}`)
  if (!sessions?.length) return { plays: [], namedRate: null }

  const ids = sessions.map(s => s.id as string)
  const { data: evs } = await sb.from('events').select('name, session_id, props').in('session_id', ids)
  const bySession = new Map<string, { name: string; props: Record<string, unknown> }[]>()
  for (const e of evs ?? []) {
    const list = bySession.get(e.session_id as string) ?? []
    list.push({ name: e.name as string, props: (e.props ?? {}) as Record<string, unknown> })
    bySession.set(e.session_id as string, list)
  }
  // handles for these browsers (a returning player may not have saved this particular game)
  const tokens = [...new Set(sessions.map(s => s.player_token as string))]
  const { data: players } = await sb.from('players').select('token, name').in('token', tokens)
  const handleByToken = new Map((players ?? []).map(p => [p.token as string, p.name as string | null]))

  const plays: Play[] = sessions.map(s => {
    const list = bySession.get(s.id as string) ?? []
    const start = list.find(e => e.name === 'game_start')
    const over = list.find(e => e.name === 'game_over')
    const saved = list.find(e => e.name === 'score_saved')
    const quarterEnds = list.filter(e => e.name === 'quarter_end').map(e => Number(e.props.quarter ?? 0))
    const reached = Math.max(1, Number(over?.props.quarter ?? 0), ...quarterEnds.map(x => x + 1))
    const ageMin = (Date.now() - new Date(s.started_at as string).getTime()) / 60000
    const status: Play['status'] = over ? 'over' : ageMin < 15 ? 'playing' : 'abandoned'
    const scoreRow = s.scores as unknown as { name: string } | { name: string }[] | null
    const savedName = Array.isArray(scoreRow) ? scoreRow[0]?.name : scoreRow?.name
    const handle = savedName || handleByToken.get(s.player_token as string) || null
    const key = String(s.player_token).slice(0, 6)
    let name: NameStatus | null = null
    if (over) {
      if (saved) name = saved.props.firstSave === true ? 'new name' : 'returning'
      else name = handle ? 'save failed' : 'anonymous'
    }
    return {
      id: s.id as string,
      startedAt: s.started_at as string,
      player: handle ?? 'Anonymous',
      playerKey: key,
      device: start ? (start.props.mobile === true ? 'Mobile' : 'Desktop') : '—',
      location: start ? placeLabel(geoOfEv(start)) : null,
      reached,
      score: over ? Number(over.props.score ?? 0) : null,
      status,
      name,
      shared: [...new Set(list.filter(e => e.name === 'share').map(e => String(e.props.channel ?? '')))],
    }
  })
  const ended = plays.filter(p => p.name !== null)
  const namedRate = ended.length ? Math.round(ended.filter(p => p.name === 'new name' || p.name === 'returning').length / ended.length * 100) : null
  return { plays, namedRate }
}
