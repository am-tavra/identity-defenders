'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateCompetitionForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      name: fd.get('name'),
      prize_description: fd.get('prize_description') || null,
      banner_text: fd.get('banner_text') || null,
      starts_at: new Date(fd.get('starts_at') as string).toISOString(),
      ends_at: new Date(fd.get('ends_at') as string).toISOString(),
    }
    const res = await fetch('/api/admin/competitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create'); setLoading(false); return }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-[#FF6B4A] to-[#E94A88] text-white font-mono text-xs tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
      >
        + NEW COMPETITION
      </button>
    )
  }

  return (
    <div className="bg-[#0d1230] border border-[#FFC857]/20 rounded-xl p-6">
      <h2 className="text-sm font-mono font-bold text-[#FFC857] mb-5">NEW COMPETITION</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs text-[#8A9AC8] font-mono tracking-wider">NAME *</label>
            <input name="name" required placeholder="May Identity Defense Challenge"
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8A9AC8] font-mono tracking-wider">PRIZE DESCRIPTION</label>
            <input name="prize_description" placeholder="$100 Amazon gift card"
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8A9AC8] font-mono tracking-wider">BANNER TEXT</label>
            <input name="banner_text" placeholder="Optional custom banner message"
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8A9AC8] font-mono tracking-wider">START DATE & TIME *</label>
            <input name="starts_at" type="datetime-local" required
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8A9AC8] font-mono tracking-wider">END DATE & TIME *</label>
            <input name="ends_at" type="datetime-local" required
              className="w-full bg-[#07091a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FFC857]/50" />
          </div>
        </div>
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-mono text-[#8A9AC8] border border-white/10 rounded-lg hover:border-white/30">
            CANCEL
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-xs font-mono text-white bg-gradient-to-r from-[#FF6B4A] to-[#E94A88] rounded-lg disabled:opacity-50">
            {loading ? 'CREATING…' : 'CREATE COMPETITION'}
          </button>
        </div>
      </form>
    </div>
  )
}
