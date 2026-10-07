'use client'
import { useState } from 'react'

// Games started per day: single series, so no legend; hover shows the exact count.
export default function DailyChart({ data }: { data: { day: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720, H = 180, padL = 28, padB = 22, padT = 10
  const max = Math.max(1, ...data.map(d => d.value))
  const niceMax = max <= 5 ? max : Math.ceil(max / 5) * 5
  const slot = (W - padL) / data.length
  const barW = Math.max(2, slot - 2)  // 2px gap between bars
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / niceMax)
  const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const ticks = [0, Math.round(data.length / 2), data.length - 1]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Games started per day">
        {[0, niceMax / 2, niceMax].map(v => (
          <g key={v}>
            <line x1={padL} x2={W} y1={y(v)} y2={y(v)} stroke="#1f2754" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#8A9AC8">{Math.round(v)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + 1, top = y(d.value), h = H - padB - top
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              {d.value > 0 && (
                <path
                  d={`M${x},${H - padB} V${top + Math.min(4, h)} q0,-4 4,-4 H${x + barW - 4} q4,0 4,4 V${H - padB} Z`}
                  fill={hover === i ? '#FFD54F' : '#FFC857'}
                />
              )}
            </g>
          )
        })}
        {ticks.map(i => data[i] && (
          <text key={i} x={padL + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#8A9AC8">{fmt(data[i].day)}</text>
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="absolute pointer-events-none bg-[#07091a] border border-[#1f2754] rounded px-2 py-1 text-xs text-white font-mono whitespace-nowrap"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%`, top: 0, transform: 'translateX(-50%)' }}
        >
          {fmt(data[hover].day)} · <b>{data[hover].value}</b> {data[hover].value === 1 ? 'game' : 'games'}
        </div>
      )}
    </div>
  )
}
