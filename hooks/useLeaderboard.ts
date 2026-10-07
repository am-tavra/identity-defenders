'use client'
// Browser-side data access. Reads use public views; every write goes through /api routes.
import { createClient, hasBackend } from '@/lib/supabase/client'
import type { CachedScore, CachedPlayer } from '@/lib/game/types'
import { MAX_SCORES } from '@/lib/game/constants'

const supabase = hasBackend ? createClient() : null

export function getPlayerToken(): string {
  let t = localStorage.getItem('id_defender_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('id_defender_token', t) }
  return t
}

export async function fetchTopScores(): Promise<CachedScore[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('leaderboard_top')
    .select('name, score, wave, streak_days, total_plays')
    .order('score', { ascending: false })
    .limit(MAX_SCORES)
  return Array.isArray(data) ? data as CachedScore[] : []
}

export interface Me { player: CachedPlayer | null; enteredCompetitionIds: string[] }

export async function fetchMe(): Promise<Me> {
  if (!hasBackend) return { player: null, enteredCompetitionIds: [] }
  try {
    const res = await fetch(`/api/player?token=${getPlayerToken()}`)
    if (res.ok) return await res.json()
  } catch {}
  return { player: null, enteredCompetitionIds: [] }
}

export async function fetchPlayer(): Promise<CachedPlayer | null> {
  return (await fetchMe()).player
}

export async function startSession(): Promise<string | null> {
  if (!hasBackend) return null
  try {
    const res = await fetch('/api/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getPlayerToken(), mobile: window.matchMedia('(pointer: coarse)').matches }),
    })
    if (res.ok) return (await res.json()).sessionId
  } catch {}
  return null
}

export type SubmitResult =
  | { ok: true; scoreId: string; player: CachedPlayer }
  | { ok: false; error: string }

export async function submitScore(args: {
  sessionId?: string | null; name: string; score: number; quarter: number
  email?: string; referredBy?: string | null
}): Promise<SubmitResult> {
  if (!hasBackend) return { ok: false, error: 'No leaderboard is connected to this build.' }
  if (!args.sessionId) return { ok: false, error: "This game wasn't registered with the server, so it can't be saved." }
  try {
    const res = await fetch('/api/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, token: getPlayerToken() }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, scoreId: body.scoreId, player: body.player }
    return { ok: false, error: body.error || 'Could not save your score.' }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection.' }
  }
}

// Fire-and-forget analytics
export function track(name: 'page_view' | 'quarter_end' | 'game_over' | 'share', props: Record<string, unknown> = {}, sessionId?: string | null) {
  if (!hasBackend) return
  try {
    const body = JSON.stringify({ name, props, sessionId: sessionId ?? null, token: getPlayerToken() })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
    else fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
  } catch {}
}
