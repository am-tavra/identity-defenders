import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const sb = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalPlayers },
    { count: scoresToday },
    { count: totalScores },
    { data: activeComp },
  ] = await Promise.all([
    sb.from('players').select('*', { count: 'exact', head: true }),
    sb.from('scores').select('*', { count: 'exact', head: true }).gte('play_date', today),
    sb.from('scores').select('*', { count: 'exact', head: true }),
    sb.from('competitions').select('id, name, ends_at, prize_description').eq('active', true).limit(1).maybeSingle(),
  ])

  let entrantCount = 0
  if (activeComp) {
    const { count } = await sb
      .from('competition_entries')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', activeComp.id)
    entrantCount = count ?? 0
  }

  const { data: recentScores } = await sb
    .from('scores')
    .select('id, name, score, wave, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return { totalPlayers, scoresToday, totalScores, activeComp, entrantCount, recentScores }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#0d1230] border border-white/10 rounded-xl p-5">
      <p className="text-xs text-[#8A9AC8] font-mono tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-[#FFC857] font-mono">{value?.toLocaleString() ?? '—'}</p>
      {sub && <p className="text-xs text-[#8A9AC8] font-mono mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const { totalPlayers, scoresToday, totalScores, activeComp, entrantCount, recentScores } = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-mono font-bold text-white tracking-wide">DASHBOARD</h1>
        <p className="text-xs text-[#8A9AC8] font-mono mt-1">Identity Defender · Live metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="TOTAL PLAYERS" value={totalPlayers ?? 0} />
        <StatCard label="SCORES TODAY" value={scoresToday ?? 0} />
        <StatCard label="ALL-TIME SCORES" value={totalScores ?? 0} />
        <StatCard
          label="ACTIVE COMPETITION"
          value={activeComp ? entrantCount : '—'}
          sub={activeComp ? `${activeComp.name} · ${entrantCount} entrants` : 'None running'}
        />
      </div>

      {/* Active competition */}
      {activeComp && (
        <div className="bg-[#0d1230] border border-[#FFC857]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono font-bold text-[#FFC857]">🏆 {activeComp.name}</h2>
            <Link href="/admin/competitions" className="text-xs font-mono text-[#8A9AC8] hover:text-white">
              MANAGE →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
            <div><span className="text-[#8A9AC8]">PRIZE: </span><span className="text-white">{activeComp.prize_description || '—'}</span></div>
            <div><span className="text-[#8A9AC8]">ENDS: </span><span className="text-white">{new Date(activeComp.ends_at).toLocaleDateString()}</span></div>
            <div><span className="text-[#8A9AC8]">ENTRANTS: </span><span className="text-white">{entrantCount}</span></div>
          </div>
        </div>
      )}

      {/* Recent scores */}
      <div className="bg-[#0d1230] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-mono font-bold text-white">RECENT SCORES</h2>
        </div>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-2 text-[#8A9AC8]">HANDLE</th>
              <th className="text-right px-5 py-2 text-[#8A9AC8]">SCORE</th>
              <th className="text-right px-5 py-2 text-[#8A9AC8]">QTR</th>
              <th className="text-right px-5 py-2 text-[#8A9AC8]">TIME</th>
            </tr>
          </thead>
          <tbody>
            {(recentScores ?? []).map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-2 text-white">{s.name}</td>
                <td className="px-5 py-2 text-[#FFC857] text-right font-bold">{s.score.toLocaleString()}</td>
                <td className="px-5 py-2 text-[#8A9AC8] text-right">Q{s.wave}</td>
                <td className="px-5 py-2 text-[#8A9AC8] text-right">{new Date(s.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
