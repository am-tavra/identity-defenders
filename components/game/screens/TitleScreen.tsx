interface TitleScreenProps {
  topScore: number
  onStart: () => void
}

export default function TitleScreen({ topScore, onStart }: TitleScreenProps) {
  return (
    <div className="overlay">
      <div className="title-main">IDENTITY<br />DEFENDER</div>
      <div className="tagline">HACKERS DON'T HACK IN <span>·</span> THEY LOG IN</div>
      {topScore > 0 && (
        <div className="title-best">PERSONAL BEST · {topScore.toLocaleString()}</div>
      )}
      <div className="briefing">
        <h3>BRIEFING</h3>
        <div style={{ marginBottom: 12, color: 'var(--text)' }}>
          Defend the identity perimeter. Shoot threats. Don't shoot sanctioned users.
          Read attacker intent — observe what identities actually do.
        </div>
        <div className="briefing-row"><span className="key">← →</span><span className="desc">Move sentinel</span></div>
        <div className="briefing-row"><span className="key">SPACE</span><span className="desc">Fire policy enforcement</span></div>
        <div className="briefing-row"><span className="key">P</span><span className="desc">Pause / resume</span></div>
      </div>
      <button className="start-btn" onClick={onStart}>INITIATE DEFENSE</button>
    </div>
  )
}
