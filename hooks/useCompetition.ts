'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient, hasBackend } from '@/lib/supabase/client'
import type { Competition, CompetitionLeaderboardRow } from '@/lib/game/types'
import { fetchMe, getPlayerToken } from './useLeaderboard'

const sb = hasBackend ? createClient() : null

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
      if (!sb) { setLoading(false); return }
      const { data: comp } = await sb
        .from('competitions')
        .select('*')
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (!comp) { setCompetition(null); setLoading(false); return }
      setCompetition(comp)

      if (playerId) {
        const me = await fetchMe()
        if (!cancelled) setIsEntered(me.enteredCompetitionIds.includes(comp.id))
      }

      const { data: lb } = await sb
        .from('competition_standings')
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
  firstName: string,
  lastName: string,
  email: string,
  linkedinUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/competition/enter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getPlayerToken(), competitionId, firstName, lastName, email, linkedinUrl }),
    })
    if (res.ok) return { ok: true }
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body.error || 'Could not enter the competition.' }
  } catch {
    return { ok: false, error: 'Could not reach the server.' }
  }
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
