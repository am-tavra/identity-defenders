import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CompetitionActions from './CompetitionActions'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const sb = createServiceClient()

  const { data: comp } = await sb
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single()

  if (!comp) notFound()

  // Entrants with their best score in this competition
  const { data: entries } = await sb
    .from('competition_entries')
    .select('id, first_name, last_name, email, linkedin_url, disqualified, entered_at, player_id')
    .eq('competition_id', id)
    .order('entered_at', { ascending: false })

  // Get leaderboard for this competition
  const { data: lb } = await sb
    .from('competition_leaderboard')
    .select('player_id, handle, best_score, current_rank, scores_count, rank_delta, new_today')
    .eq('competition_id', id)
    .order('current_rank', { ascending: true })

  const rankByPlayer = Object.fromEntries((lb ?? []).map(r => [r.player_id, r]))
  const ended = new Date(comp.ends_at) < new Date()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/competitions" className="text-xs text-[#8A9AC8] font-mono hover:text-white">
            ← COMPETITIONS
          </Link>
          <h1 className="text-lg font-mono font-bold text-white mt-2">{comp.name}</h1>
          <div className="flex gap-4 mt-1 text-xs font-mono text-[#8A9AC8]">
            <span>{new Date(comp.starts_at).toLocaleDateString()} → {new Date(comp.ends_at).toLocaleDateString()}</span>
            {comp.prize_description && <span>🏆 {comp.prize_description}</span>}
          </div>
        </div>
        <CompetitionActions comp={comp} ended={ended} />
      </div>

      {/* Leaderboard */}
      <div className="bg-[#0d1230] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold text-white">LEADERBOARD</h2>
          <a
            href={`/api/admin/competitions/${id}/export`}
            className="text-xs font-mono text-[#FFC857] hover:underline"
          >
            ↓ EXPORT CSV
          </a>
        </div>
        {!entries?.length ? (
          <p className="px-5 py-8 text-xs text-[#8A9AC8] font-mono text-center">No entrants yet.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-2 text-[#8A9AC8]">RANK</th>
                <th className="text-left px-5 py-2 text-[#8A9AC8]">NAME / HANDLE</th>
                <th className="text-left px-5 py-2 text-[#8A9AC8]">EMAIL</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">BEST SCORE</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">PLAYS</th>
                <th className="text-right px-5 py-2 text-[#8A9AC8]">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map(entry => {
                const rank = rankByPlayer[entry.player_id]
                return (
                  <tr key={entry.id} className={`border-b border-white/5 hover:bg-white/5 ${entry.disqualified ? 'opacity-40' : ''}`}>
                    <td className="px-5 py-3">
                      {rank ? (
                        <span className={`font-bold ${rank.current_rank === 1 ? 'text-[#FFD54F]' : 'text-white'}`}>
                          {rank.current_rank === 1 ? '👑 ' : ''}{rank.current_rank}
                        </span>
                      ) : <span className="text-[#8A9AC8]">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-white font-bold">{entry.first_name} {entry.last_name}</div>
                      {rank && <div className="text-[#8A9AC8] text-[10px]">{rank.handle}</div>}
                      {entry.disqualified && <div className="text-red-400 text-[10px]">DISQUALIFIED</div>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[#8A9AC8]">{entry.email}</div>
                      {entry.linkedin_url && (
                        <a href={entry.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#4FC3F7] text-[10px] hover:underline">LinkedIn ↗</a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-[#FFC857] font-bold">
                      {rank ? rank.best_score.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-[#8A9AC8]">
                      {rank ? rank.scores_count : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!entry.disqualified && (
                        <DisqualifyButton entryId={entry.id} competitionId={id} />
                      )}
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

function DisqualifyButton({ entryId, competitionId }: { entryId: string; competitionId: string }) {
  return (
    <form action={`/api/admin/competitions/${competitionId}/disqualify`} method="POST">
      <input type="hidden" name="entry_id" value={entryId} />
      <button type="submit"
        className="text-red-400 hover:text-red-300 text-[10px] font-mono"
        onClick={e => { if (!confirm('Disqualify this player from the competition?')) e.preventDefault() }}>
        DISQUALIFY
      </button>
    </form>
  )
}
