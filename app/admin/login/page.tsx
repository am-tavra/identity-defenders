'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07091a] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] text-[#8A9AC8] font-press tracking-widest mb-3">IDENTITY DEFENDER</p>
          <h1 className="text-base text-[#FFC857] font-press tracking-wide">ADMIN PORTAL</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#0d1230] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8A9AC8] font-press tracking-wider">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#8A9AC8] font-press tracking-wider">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50"
            />
          </div>
          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#FF6B4A] to-[#E94A88] text-white font-press text-[11px] tracking-widest py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}
