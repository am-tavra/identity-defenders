import { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import CountdownTimer from './CountdownTimer'
import type { Competition, CompetitionLeaderboardRow } from '@/lib/game/types'
import '../../app/game.css'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Leaderboard — Identity Defender',
  description: 'Live competition standings. Hackers don\'t hack in — they log in.',
}

function DeltaBadge({ delta, isNew }: { delta: number | null; isNew: boolean }) {
  if (isNew) return <span className="comp-lb-badge comp-lb-badge--new">NEW</span>
  if (delta === null || delta === 0) return <span className="comp-lb-badge comp-lb-badge--hold">━</span>
  const up = delta > 0
  return (
    <span className={`comp-lb-badge ${up ? 'comp-lb-badge--up' : 'comp-lb-badge--down'}`}>
      {up ? `▲${delta}` : `▼${Math.abs(delta)}`}
    </span>
  )
}

export default async function LeaderboardPage() {
  const sb = createServiceClient()

  const { data: comp } = await sb
    .from('competitions')
    .select('*')
    .eq('active', true)
    .limit(1)
    .single() as { data: Competition | null }

  let rows: CompetitionLeaderboardRow[] = []

  if (comp) {
    const { data: lb } = await sb
      .from('competition_leaderboard')
      .select('*')
      .eq('competition_id', comp.id)
      .order('current_rank', { ascending: true })
      .limit(25)
    rows = (lb as CompetitionLeaderboardRow[]) ?? []
  }

  const base = getBaseUrl()

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1a2253 0%, #07091a 80%)',
      color: '#E6ECFF',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '40px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#FFC857', letterSpacing: 2, marginBottom: 12 }}>
            IDENTITY DEFENDER
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#E6ECFF', marginBottom: 8 }}>
            {comp ? comp.name.toUpperCase() : 'LEADERBOARD'}
          </div>
          {comp && (
            <div style={{ fontSize: 13, color: '#8A9AC8' }}>
              Ends in{' '}
              <span style={{ color: '#FF6B4A' }}>
                <CountdownTimer endsAt={comp.ends_at} />
              </span>
            </div>
          )}
          {comp?.prize_description && (
            <div style={{
              marginTop: 12, fontSize: 12, color: '#FFD54F',
              background: 'rgba(255,213,79,0.1)',
              border: '1px solid rgba(255,213,79,0.3)',
              padding: '6px 16px', borderRadius: 20, display: 'inline-block',
            }}>
              🏆 {comp.prize_description}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {!comp ? (
          <div style={{ textAlign: 'center', color: '#8A9AC8', fontSize: 13, padding: '40px 0' }}>
            No active competition right now.<br />
            <a href={base} style={{ color: '#FFC857', marginTop: 16, display: 'inline-block' }}>
              Play the game →
            </a>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8A9AC8', fontSize: 13, padding: '40px 0' }}>
            No scores yet — be the first defender to enter and play!<br />
            <a href={base} style={{ color: '#FFC857', marginTop: 16, display: 'inline-block' }}>
              Play now →
            </a>
          </div>
        ) : (
          <div style={{
            background: 'rgba(13,18,48,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {rows.map((row, i) => (
              <div key={row.player_id} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 100px 60px',
                gap: 8,
                padding: '10px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: i === 0 ? 'rgba(255,200,87,0.06)' : 'transparent',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                  color: ['#FFD54F', '#CFD8DC', '#CD7F32'][i] ?? '#8A9AC8',
                  textAlign: 'center',
                }}>
                  {i === 0 ? '👑' : i === 1 ? '⭐' : i === 2 ? '⭐' : row.current_rank}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.handle}
                </span>
                <span style={{ fontSize: 13, color: '#FFC857', textAlign: 'right', fontWeight: 700 }}>
                  {row.best_score.toLocaleString()}
                </span>
                <div style={{ textAlign: 'center' }}>
                  <DeltaBadge delta={row.rank_delta} isNew={row.new_today} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href={base} style={{
            display: 'inline-block',
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            color: 'white',
            background: 'linear-gradient(135deg, #FF6B4A, #E94A88)',
            padding: '12px 24px', borderRadius: 6,
            textDecoration: 'none', letterSpacing: 1.5,
          }}>
            PLAY NOW →
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#8A9AC8', fontStyle: 'italic' }}>
          Refreshes every 30 seconds · Last updated {new Date().toUTCString()}
        </div>
      </div>
    </main>
  )
}
