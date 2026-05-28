'use client'
import { useState, useEffect, useRef } from 'react'
import {
  fetchTopScores, fetchPlayer, upsertPlayer, insertScore, insertLead, getPlayerToken,
} from '@/hooks/useLeaderboard'
import { generateShareCard, downloadShareCard } from '@/lib/game/shareCard'
import { shareUrl as buildShareUrl, getReferredByScoreId, clearReferral } from '@/lib/url'
import CompetitionTab from '../CompetitionTab'
import type { CachedScore, CachedPlayer, Badge, Competition, CompetitionLeaderboardRow } from '@/lib/game/types'
import { DISPLAY_COUNT, MAX_SCORES } from '@/lib/game/constants'

interface GameOverProps {
  score: number
  wave: number
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
function isHighScore(s: number, list: CachedScore[]) {
  if (s <= 0) return false
  if (list.length < MAX_SCORES) return true
  return s > list[list.length - 1].score
}

export default function GameOver({
  score, wave, onRestart,
  competition, competitionLeaderboard = [], myCompetitionRow = null,
  playerId, isEnteredInCompetition = false,
}: GameOverProps) {
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
  const [scoreId, setScoreId] = useState<number | null>(null)
  const [downloadLabel, setDownloadLabel] = useState('⬇️ DOWNLOAD CARD')
  const [linkedInLabel, setLinkedInLabel] = useState('in SHARE')
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const cardPreviewRef = useRef<HTMLDivElement>(null)

  // Per-score share URL — falls back to origin until score is submitted
  const currentShareUrl = scoreId ? buildShareUrl(scoreId) : (typeof window !== 'undefined' ? window.location.origin : '')

  useEffect(() => {
    async function load() {
      const list = await fetchTopScores()
      setScores(list)
      setIsTopScore(list.length === 0 || score > list[0].score)
      const token = getPlayerToken()
      const existing = await fetchPlayer(token)
      if (existing) {
        setPlayer(existing)
        const preRank = list.findIndex(s => s.score <= existing.best_score) + 1 || 99
        setBadges(computeBadges(existing, preRank))
      }
      if (isHighScore(score, list)) {
        setShowNameEntry(true)
        setTimeout(() => nameRef.current?.focus(), 100)
        if (existing?.name && nameRef.current) nameRef.current.value = existing.name
      } else {
        setShowLeaderboard(true)
        showCard(score, wave, existing, list, null)
      }
    }
    load()
  }, [score, wave])

  async function showCard(s: number, w: number, p: CachedPlayer | null, list: CachedScore[], sid: number | null) {
    const url = sid ? buildShareUrl(sid) : (typeof window !== 'undefined' ? window.location.origin : '')
    const card = await generateShareCard(s, w, url, p, list)
    setCardCanvas(card)
    if (cardPreviewRef.current) {
      cardPreviewRef.current.innerHTML = ''
      cardPreviewRef.current.appendChild(card)
    }
  }

  async function handleSubmit() {
    const rawName = nameRef.current?.value || ''
    const name = ((rawName.trim() || 'ANON').toUpperCase().replace(/\s+/g, ' ').trim().substring(0, 12)) || 'ANON'
    const email = emailRef.current?.value?.trim() || ''
    setShowNameEntry(false)

    const token = getPlayerToken()
    const referredBy = getReferredByScoreId()

    const updatedPlayer = await upsertPlayer(token, name, score)
    setPlayer(updatedPlayer)

    const newScoreId = await insertScore(updatedPlayer.id, name, score, wave, referredBy)
    if (newScoreId) { setScoreId(newScoreId); clearReferral() }

    if (email) await insertLead(updatedPlayer.id, email)
    const list = await fetchTopScores()
    setScores(list)
    const globalRank = list.findIndex(s => s.name === name && s.score === score) + 1 || 99
    setBadges(computeBadges(updatedPlayer, globalRank))
    setShowLeaderboard(true)
    await showCard(score, wave, updatedPlayer, list, newScoreId)
  }

  function shareToX() {
    const base = `I protected ${score.toLocaleString()} Identities in Identity Defender, reaching Quarter ${wave}! 🛡️ Hackers don't hack in — they log in. How many can you defend?`
    const text = encodeURIComponent(currentShareUrl ? `${base} ${currentShareUrl}` : base)
    window.open(`https://x.com/intent/post?text=${text}`, '_blank', 'noopener')
  }

  function shareToLinkedIn() {
    const base = `I protected ${score.toLocaleString()} Identities in Identity Defender, reaching Quarter ${wave}! 🛡️ Hackers don't hack in — they log in. How many can you defend?`
    const text = currentShareUrl ? `${base} ${currentShareUrl}` : base
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {})
    setLinkedInLabel('✓ TEXT COPIED · PASTE IN LI')
    setTimeout(() => setLinkedInLabel('in SHARE'), 2400)
    const url = currentShareUrl || window.location.origin
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener')
  }

  async function handleDownload() {
    if (!cardCanvas) return
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
            <button onClick={handleSubmit}>SAVE</button>
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
