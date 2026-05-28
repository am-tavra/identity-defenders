'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Competition, CompetitionLeaderboardRow } from '@/lib/game/types'

const sb = createClient()

export interface CompetitionState {
  competition: Competition | null
  isEntered: boolean
  leaderboard: CompetitionLeaderboardRow[]
  myRow: CompetitionLeaderboardRow | null
  loading: boolean
  refresh: () => void
}

export function useCompetition(playerId?: string | null): CompetitionState {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [isEntered, setIsEntered] = useState(false)
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboardRow[]>([])
  const [myRow, setMyRow] = useState<CompetitionLeaderboardRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: comp } = await sb
        .from('competitions')
        .select('*')
        .eq('active', true)
        .limit(1)
        .single()

      if (cancelled) return
      if (!comp) { setCompetition(null); setLoading(false); return }
      setCompetition(comp)

      if (playerId) {
        const { data: entry } = await sb
          .from('competition_entries')
          .select('id')
          .eq('competition_id', comp.id)
          .eq('player_id', playerId)
          .maybeSingle()
        if (!cancelled) setIsEntered(!!entry)
      }

      const { data: lb } = await sb
        .from('competition_leaderboard')
        .select('*')
        .eq('competition_id', comp.id)
        .order('current_rank', { ascending: true })
        .limit(10)

      if (!cancelled && lb) {
        setLeaderboard(lb as CompetitionLeaderboardRow[])
        if (playerId) {
          setMyRow((lb as CompetitionLeaderboardRow[]).find(r => r.player_id === playerId) ?? null)
        }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [playerId, tick])

  return { competition, isEntered, leaderboard, myRow, loading, refresh }
}

export async function enterCompetition(
  competitionId: string,
  playerId: string,
  firstName: string,
  lastName: string,
  email: string,
  linkedinUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb.from('competition_entries').insert({
    competition_id: competitionId,
    player_id: playerId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: email.trim(),
    linkedin_url: linkedinUrl?.trim() || null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function formatCountdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return 'ENDED'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}
