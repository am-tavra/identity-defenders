import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CreateCompetitionForm from './CreateCompetitionForm'

export const dynamic = 'force-dynamic'

export default async function CompetitionsPage() {
  const sb = createServiceClient()

  const { data: competitions } = await sb
    .from('competitions')
    .select('id, name, prize_description, starts_at, ends_at, active, created_at')
    .order('created_at', { ascending: false })

  const { data: entryCounts } = await sb
    .from('competition_entries')
    .select('competition_id')

  const counts = (entryCounts ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.competition_id] = (acc[e.competition_id] || 0) + 1
    return acc
  }, {})

  const now = new Date()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-bold text-white">COMPETITIONS</h1>
          <p className="text-xs text-[#8A9AC8] font-mono mt-1">Create and manage competitions</p>
        </div>
      </div>

      {/* Create form */}
      <CreateCompetitionForm />

      {/* Competition list */}
      <div className="bg-[#0d1230] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-mono font-bold text-white">ALL COMPETITIONS</h2>
        </div>
        {!competitions?.length ? (
          <p className="px-5 py-8 text-xs text-[#8A9AC8] font-mono text-center">No competitions yet.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-2 text-[#8A9AC8]">NAME</th>
                <th className="text-left px-5 py-2 text-[#8A9AC8]">STATUS</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">ENTRANTS</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">ENDS</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map(comp => {
                const ended = new Date(comp.ends_at) < now
                const status = comp.active ? 'ACTIVE' : ended ? 'ENDED' : 'INACTIVE'
                const statusColor = comp.active ? 'text-green-400' : ended ? 'text-[#8A9AC8]' : 'text-yellow-400'
                return (
                  <tr key={comp.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-5 py-3">
                      <div className="text-white font-bold">{comp.name}</div>
                      {comp.prize_description && (
                        <div className="text-[#8A9AC8] text-[10px] mt-0.5">🏆 {comp.prize_description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`${statusColor} font-bold`}>{status}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-white">{counts[comp.id] ?? 0}</td>
                    <td className="px-5 py-3 text-right text-[#8A9AC8]">
                      {new Date(comp.ends_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/competitions/${comp.id}`}
                        className="text-[#FFC857] hover:underline"
                      >
                        VIEW →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
