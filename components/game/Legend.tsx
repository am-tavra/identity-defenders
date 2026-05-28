interface LegendProps {
  visible: boolean
}

export default function Legend({ visible }: LegendProps) {
  return (
    <aside className={`legend${visible ? '' : ' collapsed'}`} aria-label="Game legend">
      <div className="legend-columns">
        <div className="legend-col">
          <h4>Threats</h4>
          <LegendRow icon={<svg viewBox="-12 -12 24 24" width="26" height="26"><polygon points="0,-9 10,8 -10,8" fill="#4FC3F7" style={{filter:'drop-shadow(0 0 4px #81D4FA)'}}/></svg>} name="Shadow IT" pts="30 / 60 pts" />
          <LegendRow icon={<svg viewBox="-12 -12 24 24" width="26" height="26"><polygon points="-10,-4 -5,-9 5,-9 10,-4 5,9 -5,9" fill="#BA68C8" style={{filter:'drop-shadow(0 0 4px #CE93D8)'}}/></svg>} name="Compromised Cred" pts="40 / 80 · wide zig-zag" />
          <LegendRow icon={<svg viewBox="-12 -12 24 24" width="26" height="26"><polygon points="0,-10 11,8 0,3 -11,8" fill="#FF7043" style={{filter:'drop-shadow(0 0 4px #FFAB91)'}}/></svg>} name="Rogue NHI" pts="50 / 100 · flagship escort" />
          <LegendRow icon={<svg viewBox="-14 -14 28 28" width="30" height="30"><polygon points="0,-12 12,0 0,12 -12,0" fill="#FFD54F" style={{filter:'drop-shadow(0 0 5px #FFE082)'}}/><circle cx="0" cy="0" r="4" fill="#0a0f24"/><circle cx="0" cy="0" r="2" fill="#FFD54F"/></svg>} name="Rogue AI Agent" pts="60–800 · kill escorts → 800" />
          <LegendRow icon={<svg viewBox="-14 -14 28 28" width="30" height="30"><polygon points="11,0 4,4 0,11 -4,4 -11,0 -4,-4 0,-11 4,-4" fill="#E94A88" style={{filter:'drop-shadow(0 0 4px #F48FB1)'}}/></svg>} name="Scattered Spider" pts="Raid · clear all 5 in time" />
        </div>
        <div className="legend-col">
          <h4>Deception</h4>
          <LegendRow icon={<svg viewBox="-12 -12 24 24" width="26" height="26"><circle cx="0" cy="0" r="9" fill="#81C784" style={{filter:'drop-shadow(0 0 4px #C8E6C9)'}}/><path d="M -3,0 L -1,3 L 4,-3" stroke="#0a0f24" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>} name="Sanctioned User" pts="DO NOT SHOOT · −200" ptsColor="#FF6B4A" />
          <LegendRow icon={<svg viewBox="-12 -12 24 24" width="26" height="26"><circle cx="0" cy="0" r="9" fill="#66BB6A" style={{filter:'drop-shadow(0 0 4px #A5D6A7)'}}/><path d="M -3,0 L -1,3 L 4,-3" stroke="#0a0f24" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>} name="LOTL (disguised)" pts="Subtle sway · drifts down" />
          <LegendRow icon={<svg viewBox="-14 -14 28 28" width="30" height="30"><polygon points="0,-12 6,-4 12,0 4,6 0,12 -4,6 -12,0 -6,-4" fill="#E53935" style={{filter:'drop-shadow(0 0 4px #FF7043)'}}/></svg>} name="LOTL (revealed)" pts="200 · +300 if caught early" />
          <p className="legend-note">Green icons look identical — read movement, not appearance.</p>
        </div>
      </div>
      <div className="legend-divider" />
      <h4>Power-Ups</h4>
      <PURow color="#4FC3F7" glyph="M" name="MFA Shield" pts="Absorbs 1 hit" />
      <PURow color="#BA68C8" glyph="G" name="Identity Graph" pts="Reveals LOTL early · 10s" />
      <PURow color="#FFD54F" glyph="P" name="Priv Access Mode" pts="3 shots on screen · 8s" />
      <PURow color="#FF6B4A" glyph="O" name="Observ Boost" pts="2× score · 15s" />
      <PURow color="#E94A88" glyph="S" name="ITDR Sweep" pts="Clears all in-flight threats" />
      <PURow color="#81C784" glyph="R" name="Rotate Secret" pts="+1 Sentinel" />
    </aside>
  )
}

function LegendRow({ icon, name, pts, ptsColor }: { icon: React.ReactNode; name: string; pts: string; ptsColor?: string }) {
  return (
    <div className="legend-row">
      <div className="legend-icon">{icon}</div>
      <div className="legend-text">
        <div className="legend-name">{name}</div>
        <div className="legend-pts" style={ptsColor ? { color: ptsColor } : {}}>{pts}</div>
      </div>
    </div>
  )
}

function PURow({ color, glyph, name, pts }: { color: string; glyph: string; name: string; pts: string }) {
  return (
    <div className="legend-row">
      <div className="legend-icon">
        <div className="pu-icon" style={{ background: color, color }}>
          <span>{glyph}</span>
        </div>
      </div>
      <div className="legend-text">
        <div className="legend-name">{name}</div>
        <div className="legend-pts">{pts}</div>
      </div>
    </div>
  )
}
