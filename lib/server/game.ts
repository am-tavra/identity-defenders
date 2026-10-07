// Server-only helpers shared by the public game API routes (service role, bypasses RLS).
import 'server-only'
import { createHash } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/

export const db = () => createServiceClient()

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function ipHash(req: NextRequest): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  return createHash('sha256').update(ip + (process.env.IP_HASH_SALT || 'identity-defender')).digest('hex').slice(0, 32)
}

// Approximate location from Vercel's IP geolocation headers. City-level at best; absent in local dev.
export type Geo = { country: string; region?: string; city?: string }
export function geoOf(req: NextRequest): Geo | null {
  const h = (k: string) => {
    const v = req.headers.get(k)?.trim()
    if (!v) return undefined
    try { return decodeURIComponent(v) } catch { return v }
  }
  const country = h('x-vercel-ip-country')
  return country ? { country, region: h('x-vercel-ip-country-region'), city: h('x-vercel-ip-city') } : null
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

export const cleanHandle = (raw: unknown) =>
  (String(raw ?? '').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12)) || 'ANON'

export async function findPlayer(token: string) {
  const { data } = await db().from('players').select('*').eq('token', token).maybeSingle()
  return data
}

// Anonymous id shared across *.threatarcade.com (set by proxy.ts). Lets the arcade admin join play across games.
export const ARCADE_COOKIE = 'arcade_id'
export function arcadeOf(req: NextRequest): string | null {
  const v = req.cookies.get(ARCADE_COOKIE)?.value ?? ''
  return UUID.test(v) ? v : null
}

// Pass `req` to stamp the event with the visitor's arcade id (props.arcade) and, on the two
// entry events, their approximate location (props.geo).
const GEO_EVENTS = new Set(['page_view', 'game_start'])
export async function logEvent(
  name: string, token: string | null, sessionId: string | null, props: Record<string, unknown> = {}, req?: NextRequest,
) {
  const stamped: Record<string, unknown> = { ...props }
  if (req) {
    const arcade = arcadeOf(req)
    if (arcade) stamped.arcade = arcade
    const geo = GEO_EVENTS.has(name) ? geoOf(req) : null
    if (geo) stamped.geo = geo
  }
  await db().from('events').insert({ name, player_token: token, session_id: sessionId, props: stamped })
}

// Fields safe to send back to the browser
export const publicPlayer = (p: Record<string, unknown> | null) => p && ({
  id: p.id, name: p.name, handle: p.handle, best_score: p.best_score,
  streak_days: p.streak_days, total_plays: p.total_plays, last_played_date: p.last_played_date,
})
