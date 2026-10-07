'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot' | 'sent'

const ERRORS: Record<string, string> = {
  link: 'That reset link is invalid or has expired. Request a new one.',
  unauthorized: 'This account does not have admin access.',
}

const INPUT = 'w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50'
const BUTTON = 'w-full bg-gradient-to-r from-[#FF6B4A] to-[#E94A88] text-white font-press text-[11px] tracking-widest py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity'
const LINK = 'text-[10px] text-[#8A9AC8] font-mono hover:text-white underline-offset-2 hover:underline'
const LABEL = 'text-[10px] text-[#8A9AC8] font-press tracking-wider'

function LoginForm() {
  const params = useSearchParams()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(ERRORS[params.get('error') ?? ''] ?? '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/admin')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Ask from a non-PKCE client, so the emailed link works in any browser, not only this one.
    // Whichever email template Supabase uses, the link ends at /admin/reset-password:
    // ours carries a token hash, the built-in one signs the user in and redirects there.
    const mailer = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'idd-reset-request' },
    })
    const { error } = await mailer.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset-password` })
    setLoading(false)
    // Rate limits are worth reporting; anything else gets the same neutral message
    // so the form doesn't reveal which emails have accounts.
    if (error && /rate limit|too many/i.test(error.message)) { setError('Too many reset emails were sent recently. Try again in an hour.'); return }
    setMode('sent')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07091a] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] text-[#8A9AC8] font-press tracking-widest mb-3">IDENTITY DEFENDER</p>
          <h1 className="text-base text-[#FFC857] font-press tracking-wide">
            {mode === 'login' ? 'ADMIN PORTAL' : mode === 'forgot' ? 'RESET PASSWORD' : 'CHECK YOUR EMAIL'}
          </h1>
        </div>

        {mode === 'sent' ? (
          <div className="bg-[#0d1230] border border-white/10 rounded-xl p-6 space-y-4 text-xs font-mono text-[#8A9AC8]">
            <p>If <span className="text-white">{email}</span> has an admin account, a reset link is on its way. It expires in an hour.</p>
            <button type="button" className={LINK} onClick={() => { setMode('login'); setError('') }}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleForgot} className="bg-[#0d1230] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className={LABEL}>EMAIL</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className={INPUT} />
            </div>
            {mode === 'login' && (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className={LABEL}>PASSWORD</label>
                  <button type="button" className={LINK} onClick={() => { setMode('forgot'); setError('') }}>Forgot password?</button>
                </div>
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className={INPUT} />
              </div>
            )}
            {mode === 'forgot' && <p className="text-xs text-[#8A9AC8] font-mono">Enter your admin email and we will send you a link to choose a new password.</p>}
            {error && <p className="text-xs text-red-400 font-mono" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className={BUTTON}>
              {mode === 'login' ? (loading ? 'SIGNING IN…' : 'SIGN IN') : (loading ? 'SENDING…' : 'SEND RESET LINK')}
            </button>
            {mode === 'forgot' && (
              <button type="button" className={LINK} onClick={() => { setMode('login'); setError('') }}>Back to sign in</button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return <Suspense><LoginForm /></Suspense>
}
