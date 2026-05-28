interface HUDProps {
  score: number
  lives: number
  wave: number
  onLegendToggle: () => void
  legendVisible: boolean
}

export default function HUD({ score, lives, wave, onLegendToggle, legendVisible }: HUDProps) {
  return (
    <div className="game-hud">
      <div className="hud-group">
        <div>
          <span className="hud-label">IDs PROTECTED:</span>{' '}
          <span className="hud-value">{score.toLocaleString()}</span>
        </div>
      </div>
      <div className="hud-group">
        <div>
          <span className="hud-label">SENTINELS:</span>{' '}
          <span className="hud-value hud-lives">{lives}</span>
        </div>
        <div>
          <span className="hud-label">QTR:</span>{' '}
          <span className="hud-value hud-wave">{wave}</span>
        </div>
        <button className="legend-toggle" onClick={onLegendToggle}>
          {legendVisible ? 'HIDE' : '? LEGEND'}
        </button>
      </div>
    </div>
  )
}
