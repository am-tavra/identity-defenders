'use client'
import { useState, useEffect, useRef } from 'react'
import { fetchTopScores, fetchPlayer, submitScore, track } from '@/hooks/useLeaderboard'
import { generateShareCard, downloadShareCard } from '@/lib/game/shareCard'
import { shareUrl as buildShareUrl, getReferredByScoreId, clearReferral } from '@/lib/url'
import CompetitionTab from '../CompetitionTab'
import type { CachedScore, CachedPlayer, Badge, Competition, CompetitionLeaderboardRow, GameResult } from '@/lib/game/types'
import { hasBackend } from '@/lib/supabase/client'
import { DISPLAY_COUNT } from '@/lib/game/constants'

interface GameOverProps {
  result: GameResult
  onRestart: () => void
  competition?: Competition | null
  competitionLeaderboard?: CompetitionLeaderboardRow[]
  myCompetitionRow?: CompetitionLeaderboardRow | null
  playerId?: string | null
  isEnteredInCompetition?: boolean
}

function computeBadges(player: CachedPlayer, globalRank: number): Badge[] {
  const badges: Badge[] = []
  const streak = player?.streak_days || 0
  const plays = player?.total_plays || 0
  if (globalRank === 1) badges.push({ cls: 'badge-rank-1', label: '👑 #1 DEFENDER' })
  else if (globalRank <= 3) badges.push({ cls: 'badge-rank-3', label: '⭐ TOP 3' })
  if (streak >= 30) badges.push({ cls: 'badge-streak', label: '🔥🔥🔥 30-DAY STREAK' })
  else if (streak >= 7) badges.push({ cls: 'badge-streak', label: '🔥🔥 7-DAY STREAK' })
  else if (streak >= 3) badges.push({ cls: 'badge-streak', label: '🔥 3-DAY STREAK' })
  if (plays >= 10) badges.push({ cls: 'badge-veteran', label: '🛡 VETERAN' })
  return badges
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}
function streakIcon(streak: number) {
  if (streak >= 30) return '🔥🔥🔥'
  if (streak >= 7) return '🔥🔥'
  if (streak >= 3) return '🔥'
  return ''
}
function rankIcon(rank: number) {
  if (rank === 1) return '👑'
  if (rank <= 3) return '⭐'
  return ''
}

export default function GameOver({
  result, onRestart,
  competition, competitionLeaderboard = [], myCompetitionRow = null,
  playerId, isEnteredInCompetition = false,
}: GameOverProps) {
  const { score, wave, sessionId } = result
  const showCompTab = !!competition && isEnteredInCompetition
  const [activeTab, setActiveTab] = useState<'global' | 'competition'>(
    showCompTab ? 'competition' : 'global'
  )
  const [scores, setScores] = useState<CachedScore[]>([])
  const [player, setPlayer] = useState<CachedPlayer | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [showNameEntry, setShowNameEntry] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [isTopScore, setIsTopScore] = useState(false)
  const [cardCanvas, setCardCanvas] = useState<HTMLCanvasElement | null>(null)
  const [scoreId, setScoreId] = useState<string | null>(null)
  const [downloadLabel, setDownloadLabel] = useState('⬇️ DOWNLOAD CARD')
  const [linkedInLabel, setLinkedInLabel] = useState('in SHARE')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const cardPreviewRef = useRef<HTMLDivElement>(null)

  // Per-score share URL — falls back to origin until score is submitted
  const currentShareUrl = scoreId ? buildShareUrl(scoreId) : (typeof window !== 'undefined' ? window.location.origin : '')

  // Returning players (who already have a handle) are saved automatically; new players pick one.
  useEffect(() => {
    async function load() {
      const list = await fetchTopScores()
      setScores(list)
      setIsTopScore(hasBackend && score > 0 && (list.length === 0 || score > list[0].score))
      const existing = await fetchPlayer()
      if (existing) setPlayer(existing)
      if (score <= 0 || !hasBackend) {
        setShowLeaderboard(hasBackend)
        showCard(score, wave, existing, list, null)
      } else if (existing?.name) {
        save(existing.name, '')
      } else {
        setShowNameEntry(true)
        setTimeout(() => nameRef.current?.focus(), 100)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, wave])

  async function showCard(s: number, w: number, p: CachedPlayer | null, list: CachedScore[], sid: string | null) {
    const url = sid ? buildShareUrl(sid) : (typeof window !== 'undefined' ? window.location.origin : '')
    const card = await generateShareCard(s, w, url, p, list)
    setCardCanvas(card)
  }
  // the preview container only exists once there is a card, so attach after that render
  useEffect(() => {
    const el = cardPreviewRef.current
    if (el && cardCanvas) { el.innerHTML = ''; el.appendChild(cardCanvas) }
  }, [cardCanvas])

  async function save(rawName: string, email: string) {
    const name = ((rawName.trim() || 'ANON').toUpperCase().replace(/\s+/g, ' ').trim().substring(0, 12)) || 'ANON'
    setSaving(true)
    setSaveError('')
    const res = await submitScore({ sessionId, name, score, quarter: wave, email, referredBy: getReferredByScoreId() })
    setSaving(false)
    if (!res.ok) {
      setSaveError(res.error)
      setShowNameEntry(false)
      setShowLeaderboard(true)
      const list = await fetchTopScores()
      await showCard(score, wave, player, list, null)
      return
    }
    setShowNameEntry(false)
    setScoreId(res.scoreId)
    clearReferral()
    setPlayer(res.player)
    const list = await fetchTopScores()
    setScores(list)
    const globalRank = list.findIndex(s => s.name === name && s.score === score) + 1 || 99
    setBadges(computeBadges(res.player, globalRank))
    setShowLeaderboard(true)
    await showCard(score, wave, res.player, list, res.scoreId)
  }

  function handleSubmit() {
    save(nameRef.current?.value || '', emailRef.current?.value?.trim() || '')
  }

  const shareBase = `I protected ${score.toLocaleString()} Identities in Identity Defender, reaching Quarter ${wave}! 🛡️ Hackers don't hack in — they log in. How many can you defend?`

  function shareToX() {
    track('share', { channel: 'x' }, sessionId)
    const text = encodeURIComponent(currentShareUrl ? `${shareBase} ${currentShareUrl}` : shareBase)
    window.open(`https://x.com/intent/post?text=${text}`, '_blank', 'noopener')
  }

  function shareToLinkedIn() {
    track('share', { channel: 'linkedin' }, sessionId)
    const text = currentShareUrl ? `${shareBase} ${currentShareUrl}` : shareBase
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {})
    setLinkedInLabel('✓ TEXT COPIED · PASTE IN LI')
    setTimeout(() => setLinkedInLabel('in SHARE'), 2400)
    const url = currentShareUrl || window.location.origin
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener')
  }

  async function handleDownload() {
    if (!cardCanvas) return
    track('share', { channel: 'download' }, sessionId)
    setDownloadLabel('⬇️ SAVING…')
    await downloadShareCard(cardCanvas, score)
    setTimeout(() => setDownloadLabel('✓ SAVED'), 100)
    setTimeout(() => setDownloadLabel('⬇️ DOWNLOAD CARD'), 1600)
  }

  return (
    <div className="overlay">
      <div className="gameover-title">IDENTITY<br />COMPROMISED</div>
      <div className="gameover-sub">INSERT CREDIT TO RE-AUTHENTICATE</div>
      {isTopScore && <div className="new-record-badge">★ NEW HIGH SCORE ★</div>}
      <div className="final-score">IDs PROTECTED: <span>{score.toLocaleString()}</span></div>
      <div className="final-wave">REACHED QTR <span>{wave}</span></div>

      {!hasBackend && <div className="gameover-sub">NO LEADERBOARD CONNECTED · SCORE NOT SAVED</div>}
      {saving && !showNameEntry && <div className="gameover-sub">SAVING YOUR SCORE…</div>}
      {saveError && <div className="save-error" role="alert">SCORE NOT SAVED: {saveError}</div>}
      {scoreId && !showNameEntry && <div className="gameover-sub">SCORE SAVED{player?.name ? ` AS ${player.name}` : ''}</div>}

      {badges.length > 0 && (
        <div className="badge-row">
          {badges.map(b => <span key={b.cls} className={`badge ${b.cls}`}>{b.label}</span>)}
        </div>
      )}

      {showNameEntry && (
        <div className="name-entry">
          <label>ENTER YOUR HANDLE</label>
          <div className="name-entry-row">
            <input ref={nameRef} type="text" maxLength={12} placeholder="ANON" autoComplete="off" spellCheck={false} />
            <button onClick={handleSubmit} disabled={saving}>{saving ? 'SAVING…' : 'SAVE'}</button>
          </div>
          <div className="email-entry-row">
            <input ref={emailRef} type="email" placeholder="email (optional · saves your streak)" autoComplete="email" />
          </div>
        </div>
      )}

      {showCompTab && showLeaderboard && (
        <div className="go-tabs">
          <button
            className={`go-tab${activeTab === 'global' ? ' active' : ''}`}
            onClick={() => setActiveTab('global')}
          >GLOBAL</button>
          <button
            className={`go-tab${activeTab === 'competition' ? ' active' : ''}`}
            onClick={() => setActiveTab('competition')}
          >🏆 COMPETITION</button>
        </div>
      )}

      {showCompTab && showLeaderboard && activeTab === 'competition' && (
        <CompetitionTab
          competition={competition!}
          leaderboard={competitionLeaderboard}
          myRow={myCompetitionRow}
          playerId={playerId ?? null}
        />
      )}

      {showLeaderboard && (!showCompTab || activeTab === 'global') && (
        <div className="leaderboard">
          <h4>TOP DEFENDERS</h4>
          <div>
            {scores.length === 0 ? (
              <div className="lb-empty">No scores yet — be the first defender</div>
            ) : (
              scores.slice(0, DISPLAY_COUNT).map((s, i) => {
                const isYou = player && s.name === player.name && s.score === score
                return (
                  <div key={i} className={`lb-row rank-${i + 1}${isYou ? ' you' : ''}`}>
                    <span className="lb-rank">{i + 1}</span>
                    <span className="lb-name" dangerouslySetInnerHTML={{ __html: escapeHtml(s.name) }} />
                    <span className="lb-score">{s.score.toLocaleString()}</span>
                    <span className="lb-wave">Q{s.wave}</span>
                    <span className="lb-badge">{rankIcon(i + 1)}</span>
                    <span className="lb-badge">{streakIcon(s.streak_days)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {cardCanvas && <div className="card-preview" ref={cardPreviewRef} />}

      <div className="share-row">
        <button className="share-btn" onClick={handleDownload}>{downloadLabel}</button>
        <button className="share-btn" onClick={shareToX}>𝕏 SHARE</button>
        <button className="share-btn" onClick={shareToLinkedIn}>{linkedInLabel}</button>
      </div>

      <button className="start-btn" onClick={onRestart}>RETRY</button>
    </div>
  )
}
