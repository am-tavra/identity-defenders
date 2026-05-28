import { POWERUP } from '@/lib/game/constants'
import type { ActivePowerup } from '@/lib/game/types'

interface PowerupTrayProps {
  activePU: Record<string, ActivePowerup>
}

export default function PowerupTray({ activePU }: PowerupTrayProps) {
  const entries = Object.values(activePU)
  if (entries.length === 0) return null
  return (
    <div className="pu-tray">
      {entries.map(pu => {
        const def = POWERUP[pu.key]
        const pct = pu.ttl === -1 ? 100 : pu.ttl > 0 ? (pu.ttl / def.duration) * 100 : 100
        return (
          <div key={pu.key} className="pu-slot">
            <div className="pu-name" style={{ color: def.color }}>{def.label}</div>
            <div className="pu-bar">
              <div style={{ width: `${pct}%`, background: def.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
