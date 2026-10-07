import Link from 'next/link'
import { getAnalytics, getPlays, RANGES, type Range, type Play } from '@/lib/server/analytics'
import DailyChart from './DailyChart'

export const dynamic = 'force-dynamic'

const PANEL = 'bg-[#0d1230] border border-white/10 rounded-xl'
const DIM = 'text-[#8A9AC8]'
const H2 = 'text-xs font-press text-white tracking-wider'

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${PANEL} p-4`}>
      <p className={`text-[10px] ${DIM} font-press tracking-wider mb-2`}>{label}</p>
      <p className="text-2xl font-bold text-[#FFC857] font-mono tabular-nums">{value}</p>
      {sub && <p className={`text-[10px] ${DIM} font-mono mt-1`}>{sub}</p>}
    </div>
  )
}

const n = (v: number | string | null, suffix = '') => (v === null ? '—' : v.toLocaleString() + suffix)

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: raw } = await searchParams
  const range: Range = raw === '7d' || raw === 'all' ? raw : '30d'
  const [a, { plays, namedRate }] = await Promise.all([getAnalytics(range), getPlays(range)])
  const t = a.tiles
  const top = Math.max(1, a.funnel[0].value)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-press text-white tracking-wide">ANALYTICS</h1>
          <p className={`text-[10px] ${DIM} font-mono mt-2`}>Who is playing, how far they get, and what they do after.</p>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Date range">
          {(Object.keys(RANGES) as Range[]).map(r => (
            <Link key={r} href={`/admin/analytics?range=${r}`}
              className={`text-[10px] font-press tracking-wider px-3 py-1.5 rounded border ${r === range ? 'border-[#FFC857] text-[#FFC857] bg-[#FFC857]/10' : `border-white/10 ${DIM} hover:text-white`}`}>
              {RANGES[r].label.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="VISITORS" value={n(t.visitors)} sub={t.mobileShare === null ? undefined : `${t.mobileShare}% on mobile`} />
        <Tile label="GAMES STARTED" value={n(t.gamesStarted)} />
        <Tile label="AVG QUARTER REACHED" value={n(t.avgQuarter)} sub={t.reachedQ4Rate === null ? undefined : `${t.reachedQ4Rate}% of players reach Q4`} />
        <Tile label="AVG SCORE" value={n(t.avgScore)} sub="identities protected" />
        <Tile label="PLAYS WITH A NAME" value={n(namedRate, '%')} sub={`${n(t.scoresSaved)} scores saved`} />
        <Tile label="EMAILS CAPTURED" value={n(t.emails)} />
        <Tile label="SHARES" value={n(t.shares)} />
        <Tile label="COMPETITION ENTRIES" value={n(t.entries)} />
      </div>

      <section className={`${PANEL} p-5`}>
        <h2 className={`${H2} mb-1`}>PLAYER FUNNEL</h2>
        <p className={`text-[10px] ${DIM} font-mono mb-4`}>Unique players reaching each step · % of visitors</p>
        <div className="space-y-2">
          {a.funnel.map(s => (
            <div key={s.label} className="grid grid-cols-[140px_1fr_90px] items-center gap-3 text-xs font-mono">
              <span className={DIM}>{s.label}</span>
              <div className="h-5 bg-white/5 rounded-r">
                {s.value > 0 && <div className="h-5 bg-gradient-to-r from-[#FF6B4A] to-[#FFC857] rounded-r" style={{ width: `${(s.value / top) * 100}%` }} />}
              </div>
              <span className="text-white tabular-nums text-right">
                {s.value.toLocaleString()} <span className={DIM}>· {Math.round((s.value / top) * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${PANEL} p-5`}>
        <h2 className={`${H2} mb-1`}>GAMES STARTED PER DAY</h2>
        <p className={`text-[10px] ${DIM} font-mono mb-3`}>UTC days · {range === 'all' ? 'last 30 days' : RANGES[range].label.toLowerCase()}</p>
        <DailyChart data={a.daily} />
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'SHARES BY CHANNEL', rows: a.shares, empty: 'No shares yet' },
          { title: 'WHERE VISITORS CAME FROM', rows: a.referrers, empty: 'No visits yet' },
          { title: 'WHERE GAMES ENDED', rows: a.quitQuarter, empty: 'No finished games yet' },
        ].map(block => (
          <section key={block.title} className={`${PANEL} p-5`}>
            <h2 className={`${H2} mb-3`}>{block.title}</h2>
            {block.rows.length === 0 ? <p className={`text-xs ${DIM} font-mono`}>{block.empty}</p> : (
              <table className="w-full text-xs font-mono">
                <tbody>
                  {block.rows.map(([k, v]) => (
                    <tr key={k} className="border-t border-white/10">
                      <td className={`py-1.5 ${DIM}`}>{k}</td>
                      <td className="py-1.5 text-right text-white tabular-nums">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <section className={`${PANEL} p-5`}>
        <h2 className={`${H2} mb-1`}>WHERE PLAYERS ARE</h2>
        <p className={`text-[10px] ${DIM} font-mono mb-4`}>
          Unique players by approximate location, from their IP address. City-level at best; VPNs and some mobile networks show the wrong place.
          {a.locatedPlayers ? ` ${a.locatedPlayers.toLocaleString()} ${a.locatedPlayers === 1 ? 'player' : 'players'} located.` : ''}
        </p>
        {a.locatedPlayers === 0 ? <p className={`text-xs ${DIM} font-mono`}>No location data in this range yet.</p> : (
          <div className="grid md:grid-cols-2 gap-6">
            {[{ title: 'COUNTRIES', rows: a.countries }, { title: 'CITIES', rows: a.cities }].map(block => (
              <div key={block.title}>
                <h3 className={`text-[10px] font-press tracking-wider ${DIM} mb-2`}>{block.title}</h3>
                <table className="w-full text-xs font-mono">
                  <tbody>
                    {block.rows.map(([k, v]) => (
                      <tr key={k} className="border-t border-white/10">
                        <td className={`py-1.5 ${DIM}`}>{k}</td>
                        <td className="py-1.5 text-right text-white tabular-nums">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${PANEL} p-5`}>
        <h2 className={`${H2} mb-1`}>PLAYS</h2>
        <p className={`text-[10px] ${DIM} font-mono mb-4`}>
          Every game, newest first (up to 100). Each play has its own session ID; the player ID is the same for repeat plays in one browser.
        </p>
        {plays.length === 0 ? <p className={`text-xs ${DIM} font-mono`}>No plays in this range yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono min-w-[880px]">
              <thead>
                <tr className={`text-left text-[10px] font-press tracking-wider ${DIM}`}>
                  {['STARTED', 'PLAYER', 'NAME', 'DEVICE', 'LOCATION', 'REACHED', 'RESULT', 'SCORE', 'SHARED', 'SESSION'].map(h => (
                    <th key={h} className={`py-2 pr-3 font-normal ${h === 'SCORE' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plays.map(p => <PlayRow key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const NAME_STYLE: Record<string, string> = {
  'new name': 'text-[#FFC857] border-[#FFC857]',
  returning: 'text-white border-white/40',
  anonymous: 'text-[#8A9AC8] border-white/15',
  'save failed': 'text-[#FF7043] border-[#FF7043]',
}

function PlayRow({ p }: { p: Play }) {
  const when = new Date(p.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const result = { over: 'Identity compromised', playing: 'In progress', abandoned: 'Abandoned' }[p.status]
  return (
    <tr className="border-t border-white/10">
      <td className={`py-2 pr-3 ${DIM} whitespace-nowrap`}>{when}</td>
      <td className="py-2 pr-3 text-white whitespace-nowrap">
        {p.player} <span className={`${DIM} text-[10px]`}>· {p.playerKey}</span>
      </td>
      <td className="py-2 pr-3">
        {p.name ? <span className={`text-[10px] border rounded px-1.5 py-0.5 whitespace-nowrap ${NAME_STYLE[p.name]}`}>{p.name}</span> : <span className={DIM}>—</span>}
      </td>
      <td className={`py-2 pr-3 ${DIM}`}>{p.device}</td>
      <td className={`py-2 pr-3 ${DIM} whitespace-nowrap`}>{p.location ?? '—'}</td>
      <td className="py-2 pr-3 text-white tabular-nums">Q{p.reached}</td>
      <td className={`py-2 pr-3 ${DIM} whitespace-nowrap`}>{result}</td>
      <td className="py-2 pr-3 text-[#FFC857] text-right tabular-nums">{p.score === null ? '—' : p.score.toLocaleString()}</td>
      <td className={`py-2 pr-3 ${DIM}`}>{p.shared.length ? p.shared.join(', ') : '—'}</td>
      <td className={`py-2 ${DIM} text-[10px]`} title={p.id}>{p.id.slice(0, 8)}</td>
    </tr>
  )
}
