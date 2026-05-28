'use client'
import { createClient } from '@/lib/supabase/client'
import type { CachedScore, CachedPlayer } from '@/lib/game/types'
import { MAX_SCORES } from '@/lib/game/constants'

const supabase = createClient()

export async function fetchTopScores(): Promise<CachedScore[]> {
  const { data } = await supabase
    .from('scores')
    .select('name, score, wave, players(streak_days, total_plays)')
    .order('score', { ascending: false })
    .limit(MAX_SCORES)
  if (!Array.isArray(data)) return []
  return data.map((r: any) => ({
    name: r.name, score: r.score, wave: r.wave,
    streak_days: r.players?.streak_days || 0,
    total_plays: r.players?.total_plays || 0,
  }))
}

export async function fetchPlayer(token: string): Promise<CachedPlayer | null> {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('token', token)
    .limit(1)
  return Array.isArray(data) && data.length ? data[0] : null
}

export async function upsertPlayer(token: string, name: string, score: number): Promise<CachedPlayer> {
  const existing = await fetchPlayer(token)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  let streak = 1
  if (existing) {
    if (existing.last_played_date === today) streak = existing.streak_days
    else if (existing.last_played_date === yesterday) streak = (existing.streak_days || 0) + 1
  }
  const payload = {
    name, streak_days: streak, last_played_date: today,
    best_score: existing ? Math.max(existing.best_score || 0, score) : score,
    total_plays: (existing?.total_plays || 0) + 1,
  }
  if (existing) {
    const { data } = await supabase.from('players').update(payload).eq('token', token).select()
    return Array.isArray(data) && data.length ? data[0] : { ...existing, ...payload }
  } else {
    const { data } = await supabase.from('players').insert({ token, ...payload }).select()
    return Array.isArray(data) && data.length ? data[0] : { token, ...payload } as CachedPlayer
  }
}

export async function insertScore(
  playerId: string,
  name: string,
  score: number,
  wave: number,
  referredByScoreId?: number | null,
): Promise<number | null> {
  const row: Record<string, unknown> = { player_id: playerId, name, score, wave }
  if (referredByScoreId) row.referred_by_score_id = referredByScoreId
  const { data } = await supabase
    .from('scores')
    .insert(row)
    .select('id')
  return Array.isArray(data) && data.length ? data[0].id : null
}

export async function insertLead(playerId: string, email: string) {
  await supabase.from('leads').insert({ player_id: playerId, email, source: 'score_save' })
}

export function getPlayerToken(): string {
  let t = localStorage.getItem('id_defender_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('id_defender_token', t) }
  return t
}
