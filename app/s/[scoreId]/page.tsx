import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getBaseUrl, ogImageUrl } from '@/lib/url'
import ReferralTracker from './ReferralTracker'
import '../../../app/game.css'

interface Props {
  params: Promise<{ scoreId: string }>
}

async function getScoreData(scoreId: string) {
  const sb = createServiceClient()

  const { data: score } = await sb
    .from('scores')
    .select('id, name, score, wave, created_at, player_id')
    .eq('id', scoreId)
    .single()

  if (!score) return null

  const { data: player } = await sb
    .from('players')
    .select('handle, name')
    .eq('id', score.player_id)
    .single()

  const handle = player?.handle || score.name || 'DEFENDER'

  // Check if this score falls within an active competition the player entered
  const { data: comp } = await sb
    .from('competitions')
    .select('id, name, ends_at')
    .lte('starts_at', score.created_at)
    .gte('ends_at', score.created_at)
    .limit(1)
    .single()

  let rank: number | null = null
  let delta: number | null = null
  let compName: string | null = null

  if (comp) {
    const { data: entry } = await sb
      .from('competition_entries')
      .select('player_id')
      .eq('competition_id', comp.id)
      .eq('player_id', score.player_id)
      .single()

    if (entry) {
      compName = comp.name
      const { data: lb } = await sb
        .from('competition_leaderboard')
        .select('current_rank, rank_delta')
        .eq('competition_id', comp.id)
        .eq('player_id', score.player_id)
        .single()

      if (lb) {
        rank = lb.current_rank
        delta = lb.rank_delta
      }
    }
  }

  return { score, handle, rank, delta, compName }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scoreId } = await params
  const data = await getScoreData(scoreId)
  if (!data) return { title: 'Identity Defender' }

  const { score, handle, rank, delta, compName } = data
  const base = getBaseUrl()

  const ogImg = ogImageUrl({
    name: handle,
    score: score.score,
    wave: score.wave,
    ...(rank    ? { rank: String(rank) }    : {}),
    ...(delta !== null ? { delta: String(delta) } : {}),
    ...(compName ? { comp: compName }       : {}),
    url: `${base}/s/${scoreId}`,
  })

  const title = `${handle} protected ${score.score.toLocaleString()} Identities`
  const description = `Reached Quarter ${score.wave}. Hackers don't hack in — they log in. How many can you defend?`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/s/${scoreId}`,
      images: [{ url: ogImg, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImg],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { scoreId } = await params
  const data = await getScoreData(scoreId)
  if (!data) notFound()

  const { score, handle, rank, delta, compName } = data
  const base = getBaseUrl()
  const playUrl = base

  return (
    <>
      <ReferralTracker scoreId={scoreId} />
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          background: 'radial-gradient(ellipse at top, #1a2253 0%, #07091a 80%)',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#E6ECFF',
        }}
      >
        {/* Score card */}
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#FFC857', marginBottom: 24, letterSpacing: 2 }}>
            IDENTITY DEFENDER
          </div>

          {compName && rank && (
            <div style={{
              display: 'inline-block',
              fontSize: 11, color: '#FF6B4A',
              background: 'rgba(255,107,74,0.12)',
              border: '1px solid rgba(255,107,74,0.4)',
              padding: '5px 14px', borderRadius: 20,
              fontFamily: "'Press Start 2P', monospace",
              marginBottom: 20,
            }}>
              {compName} · RANK #{rank}
              {delta !== null && delta !== 0 && (
                <span style={{ color: delta > 0 ? '#81C784' : '#FF7043', marginLeft: 6 }}>
                  {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                </span>
              )}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#8A9AC8', marginBottom: 8, letterSpacing: 1 }}>
            IDENTITIES PROTECTED
          </div>

          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 56, color: '#FFC857',
            marginBottom: 16, lineHeight: 1.2,
          }}>
            {score.score.toLocaleString()}
          </div>

          <div style={{ fontSize: 13, color: '#FF6B4A', marginBottom: 6 }}>
            REACHED QUARTER {score.wave} · DEFENDED BY {handle}
          </div>

          <div style={{ fontSize: 13, color: '#8A9AC8', marginBottom: 36, fontStyle: 'italic' }}>
            "Hackers don't hack in — they log in."
          </div>

          <a
            href={playUrl}
            style={{
              display: 'inline-block',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 12, color: 'white',
              background: 'linear-gradient(135deg, #FF6B4A, #E94A88)',
              padding: '14px 28px', borderRadius: 6,
              textDecoration: 'none', letterSpacing: 1.5,
            }}
          >
            PLAY NOW →
          </a>
        </div>
      </main>
    </>
  )
}
