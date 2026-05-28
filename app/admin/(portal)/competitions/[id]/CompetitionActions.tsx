'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Comp { id: string; active: boolean; name: string }

export default function CompetitionActions({ comp, ended }: { comp: Comp; ended: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleActive() {
    if (!confirm(comp.active ? 'Deactivate this competition?' : 'Activate this competition? Any other active competition will need to be deactivated first.')) return
    setLoading(true)
    await fetch(`/api/admin/competitions/${comp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !comp.active }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      {!ended && (
        <button
          onClick={toggleActive}
          disabled={loading}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            comp.active
              ? 'border-red-400/40 text-red-400 hover:bg-red-400/10'
              : 'border-green-400/40 text-green-400 hover:bg-green-400/10'
          }`}
        >
          {loading ? '…' : comp.active ? 'DEACTIVATE' : 'ACTIVATE'}
        </button>
      )}
      <a
        href={`/leaderboard`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-white/10 text-[#8A9AC8] hover:text-white hover:border-white/30 transition-colors"
      >
        PUBLIC PAGE ↗
      </a>
    </div>
  )
}
