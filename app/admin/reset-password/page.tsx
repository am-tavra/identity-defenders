'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MIN = 10

const INPUT = 'w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50'
const BUTTON = 'w-full bg-gradient-to-r from-[#FF6B4A] to-[#E94A88] text-white font-press text-[11px] tracking-widest py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity'
const LABEL = 'text-[10px] text-[#8A9AC8] font-press tracking-wider'

// Reached three ways:
// - from our reset email, with ?token_hash=…: the token is only spent when the form is submitted,
//   so opening the link (or an email scanner fetching it) does not use it up;
// - from Supabase's built-in reset email, which signs the user in and redirects here with the
//   session in the URL fragment, or with ?error=… if the link was already used or has expired;
// - directly, by an admin who is already signed in.
function ResetForm() {
  const tokenHash = useSearchParams().get('token_hash')
  const verified = useRef(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const [sb] = useState(createClient)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('error') || new URLSearchParams(window.location.search).get('error')) { router.replace('/admin/login?error=link'); return }
    const access_token = hash.get('access_token'), refresh_token = hash.get('refresh_token')
    if (!access_token || !refresh_token) return
    sb.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) router.replace('/admin/login?error=link')
      else window.history.replaceState(null, '', window.location.pathname)  // keep the tokens out of the address bar
    })
  }, [router, sb])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN) { setError(`Use at least ${MIN} characters.`); return }
    if (password !== confirm) { setError('The two passwords do not match.'); return }
    setLoading(true)
    if (tokenHash && !verified.current) {
      const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      if (error) { router.push('/admin/login?error=link'); return }
      verified.current = true
    }
    const { error } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(/session missing/i.test(error.message) ? 'Sign in first, or open the link from a reset email.' : error.message)
      return
    }
    setDone(true)
    setTimeout(() => { router.push('/admin'); router.refresh() }, 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07091a] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] text-[#8A9AC8] font-press tracking-widest mb-3">IDENTITY DEFENDER</p>
          <h1 className="text-base text-[#FFC857] font-press tracking-wide">NEW PASSWORD</h1>
        </div>
        {done ? (
          <p className="bg-[#0d1230] border border-white/10 rounded-xl p-6 text-xs font-mono text-white">Password updated. Taking you to the admin portal…</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#0d1230] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className={LABEL}>NEW PASSWORD</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password}
                onChange={e => setPassword(e.target.value)} required className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className={LABEL}>CONFIRM NEW PASSWORD</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required className={INPUT} />
            </div>
            {error && <p className="text-xs text-red-400 font-mono" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? 'SAVING…' : 'SAVE NEW PASSWORD'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return <Suspense><ResetForm /></Suspense>
}
