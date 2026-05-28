import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const sb = createServiceClient()

  const { data: players } = await sb
    .from('players')
    .select('id, handle, name, email, best_score, streak_days, total_plays, last_played_date, created_at')
    .order('best_score', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-press text-white tracking-wide">PLAYERS</h1>
          <p className="text-[10px] text-[#8A9AC8] font-mono mt-2">Top 100 by score · {players?.length ?? 0} shown</p>
        </div>
        <a
          href="/api/admin/players/export"
          className="text-[10px] font-press tracking-wider text-[#FFC857] border border-[#FFC857]/30 px-3 py-2 rounded-lg hover:bg-[#FFC857]/10 transition-colors"
        >
          ↓ EXPORT CSV
        </a>
      </div>

      <div className="bg-[#0d1230] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">HANDLE / NAME</th>
              <th className="text-left px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">EMAIL</th>
              <th className="text-right px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">BEST SCORE</th>
              <th className="text-right px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">STREAK</th>
              <th className="text-right px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">PLAYS</th>
              <th className="text-right px-5 py-3 text-[#8A9AC8] text-[10px] font-press tracking-wider">LAST PLAYED</th>
            </tr>
          </thead>
          <tbody>
            {(players ?? []).map((p, i) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="text-white font-bold">{p.handle || p.name || 'ANON'}</div>
                  {p.handle && p.name && p.handle !== p.name && (
                    <div className="text-[#8A9AC8] text-[10px]">{p.name}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-[#8A9AC8]">{p.email || '—'}</td>
                <td className="px-5 py-3 text-right">
                  <span className={i === 0 ? 'text-[#FFD54F] font-bold' : 'text-[#FFC857]'}>
                    {p.best_score?.toLocaleString() ?? '—'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-[#8A9AC8]">
                  {p.streak_days ? `🔥 ${p.streak_days}d` : '—'}
                </td>
                <td className="px-5 py-3 text-right text-[#8A9AC8]">{p.total_plays ?? 0}</td>
                <td className="px-5 py-3 text-right text-[#8A9AC8]">
                  {p.last_played_date ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
