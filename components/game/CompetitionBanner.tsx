'use client'
import { useState, useEffect } from 'react'
import { enterCompetition, formatCountdown } from '@/hooks/useCompetition'
import type { Competition } from '@/lib/game/types'

interface Props {
  competition: Competition
  playerId: string | null
  isEntered: boolean
  onEntered: () => void
}

type Step = 'banner' | 'form' | 'success'

export default function CompetitionBanner({ competition, playerId, isEntered, onEntered }: Props) {
  const [step, setStep] = useState<Step>('banner')
  const [dismissed, setDismissed] = useState(false)
  const [countdown, setCountdown] = useState(() => formatCountdown(competition.ends_at))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedin, setLinkedin] = useState('')

  useEffect(() => {
    const interval = setInterval(() => setCountdown(formatCountdown(competition.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [competition.ends_at])

  if (dismissed) return null
  if (countdown === 'ENDED') return null

  if (isEntered) {
    return (
      <div className="comp-banner comp-banner--entered">
        <span className="comp-banner-trophy">🏆</span>
        <span className="comp-banner-name">{competition.name}</span>
        <span className="comp-banner-countdown">{countdown}</span>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId) { setFormError('Play a game first to register.'); return }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('First name, last name, and email are required.')
      return
    }
    setSubmitting(true)
    setFormError('')
    const result = await enterCompetition(competition.id, playerId, firstName, lastName, email, linkedin)
    setSubmitting(false)
    if (!result.ok) { setFormError(result.error || 'Something went wrong.'); return }
    setStep('success')
    onEntered()
  }

  if (step === 'success') {
    return (
      <div className="comp-modal-overlay">
        <div className="comp-modal">
          <div className="comp-modal-title" style={{ color: '#81C784' }}>✓ YOU'RE IN!</div>
          <p className="comp-modal-body">
            You're registered for <strong>{competition.name}</strong>.<br />
            Play your best game. Competition ends in <strong>{countdown}</strong>.
          </p>
          {competition.prize_description && (
            <p className="comp-modal-prize">🏆 Prize: {competition.prize_description}</p>
          )}
          <button className="comp-modal-btn" onClick={() => setDismissed(true)}>PLAY NOW</button>
        </div>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div className="comp-modal-overlay">
        <div className="comp-modal">
          <div className="comp-modal-title">{competition.name.toUpperCase()}</div>
          {competition.prize_description && (
            <p className="comp-modal-prize">🏆 {competition.prize_description}</p>
          )}
          <p className="comp-modal-body">Ends in {countdown} · Top score wins.</p>
          <form onSubmit={handleSubmit} className="comp-form">
            <div className="comp-form-row">
              <input
                className="comp-input"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <input
                className="comp-input"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <input
              className="comp-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="comp-input"
              placeholder="LinkedIn URL (optional)"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
            />
            {formError && <p className="comp-form-error">{formError}</p>}
            <div className="comp-form-actions">
              <button type="button" className="comp-modal-btn comp-modal-btn--ghost"
                onClick={() => setDismissed(true)}>Maybe later</button>
              <button type="submit" className="comp-modal-btn" disabled={submitting}>
                {submitting ? 'ENTERING…' : 'ENTER COMPETITION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="comp-banner">
      <span className="comp-banner-trophy">🏆</span>
      <span className="comp-banner-name">{competition.name}</span>
      {competition.prize_description && (
        <span className="comp-banner-prize">{competition.prize_description}</span>
      )}
      <span className="comp-banner-countdown">{countdown}</span>
      <button className="comp-banner-cta" onClick={() => setStep('form')}>ENTER →</button>
      <button className="comp-banner-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">✕</button>
    </div>
  )
}
