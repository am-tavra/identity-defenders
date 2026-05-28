'use client'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/hooks/useCompetition'
import type { Competition, CompetitionLeaderboardRow } from '@/lib/game/types'

interface Props {
  competition: Competition
  leaderboard: CompetitionLeaderboardRow[]
  myRow: CompetitionLeaderboardRow | null
  playerId: string | null
}

function DeltaBadge({ delta, isNew }: { delta: number | null; isNew: boolean }) {
  if (isNew) return <span className="comp-lb-badge comp-lb-badge--new">NEW</span>
  if (delta === null || delta === 0) return <span className="comp-lb-badge comp-lb-badge--hold">━</span>
  const up = delta > 0
  const size = Math.min(Math.abs(delta), 5)
  return (
    <span className={`comp-lb-badge ${up ? 'comp-lb-badge--up' : 'comp-lb-badge--down'}`}
      style={{ fontSize: 10 + size }}>
      {up ? `▲${delta}` : `▼${Math.abs(delta)}`}
    </span>
  )
}

export default function CompetitionTab({ competition, leaderboard, myRow, playerId }: Props) {
  const [countdown, setCountdown] = useState(() => formatCountdown(competition.ends_at))

  useEffect(() => {
    const interval = setInterval(() => setCountdown(formatCountdown(competition.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [competition.ends_at])

  return (
    <div className="comp-tab">
      <div className="comp-tab-header">
        <span className="comp-tab-name">{competition.name}</span>
        <span className="comp-tab-countdown">⏱ {countdown}</span>
      </div>
      {competition.prize_description && (
        <div className="comp-tab-prize">🏆 {competition.prize_description}</div>
      )}

      {myRow && (
        <div className="comp-tab-myrank">
          <span>YOUR RANK</span>
          <span style={{ color: '#FFC857', fontSize: 18 }}>#{myRow.current_rank}</span>
          <DeltaBadge delta={myRow.rank_delta} isNew={myRow.new_today} />
        </div>
      )}

      <div className="comp-lb">
        {leaderboard.length === 0 ? (
          <div className="lb-empty">No scores yet — be the first!</div>
        ) : (
          leaderboard.map(row => {
            const isYou = row.player_id === playerId
            return (
              <div key={row.player_id} className={`comp-lb-row${isYou ? ' you' : ''}`}>
                <span className="lb-rank" style={row.current_rank <= 3 ? { color: ['#FFD54F','#CFD8DC','#CD7F32'][row.current_rank - 1] } : {}}>
                  {row.current_rank}
                </span>
                <span className="lb-name">{row.handle}</span>
                <span className="lb-score">{row.best_score.toLocaleString()}</span>
                <DeltaBadge delta={row.rank_delta} isNew={row.new_today} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
