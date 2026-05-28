'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameLoop } from '@/hooks/useGameLoop'
import { useAlert } from './Alert'
import { useCompetition } from '@/hooks/useCompetition'
import HUD from './HUD'
import Legend from './Legend'
import PowerupTray from './PowerupTray'
import TouchControls from './TouchControls'
import CompetitionBanner from './CompetitionBanner'
import TitleScreen from './screens/TitleScreen'
import PauseScreen from './screens/PauseScreen'
import GameOver from './screens/GameOver'
import { fetchTopScores, fetchPlayer, getPlayerToken } from '@/hooks/useLeaderboard'
import type { GameState, ActivePowerup } from '@/lib/game/types'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [gameState, setGameState] = useState<GameState>('title')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [wave, setWave] = useState(1)
  const [activePU, setActivePU] = useState<Record<string, ActivePowerup>>({})
  const [topScore, setTopScore] = useState(0)
  const [legendVisible, setLegendVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [gameOverScore, setGameOverScore] = useState(0)
  const [gameOverWave, setGameOverWave] = useState(1)
  const [playerId, setPlayerId] = useState<string | null>(null)

  const [alertHandle, alertNode] = useAlert()

  const { competition, isEntered, leaderboard, myRow, refresh: refreshCompetition } = useCompetition(playerId)

  const callbacks = {
    onHUDChange: useCallback((s: number, l: number, w: number) => {
      setScore(s); setLives(l); setWave(w)
    }, []),
    onStateChange: useCallback((state: GameState) => {
      setGameState(state)
      const mobile = window.matchMedia('(pointer: coarse)').matches
      setIsMobile(mobile)
      if (mobile && (state === 'playing' || state === 'warmup')) setLegendVisible(false)
    }, []),
    onAlert: useCallback((text: string, ms?: number) => alertHandle.show(text, ms), [alertHandle]),
    onPUChange: useCallback((pu: Record<string, ActivePowerup>) => setActivePU({ ...pu }), []),
    onGameOver: useCallback((s: number, w: number) => {
      setGameOverScore(s); setGameOverWave(w); setGameState('gameover')
      refreshCompetition()
    }, [refreshCompetition]),
  }

  const { startGame, togglePause, triggerFire, setKey } = useGameLoop(canvasRef, callbacks)

  useEffect(() => {
    fetchTopScores().then(list => { if (list.length) setTopScore(list[0].score) })
    // Load player ID for competition checks
    const token = getPlayerToken()
    fetchPlayer(token).then(p => { if (p) setPlayerId(p.id) })
  }, [])

  const handleTouchKey = useCallback((key: string, down: boolean) => setKey(key, down), [setKey])
  const handleTouchFire = useCallback((down: boolean) => { if (down) triggerFire() }, [triggerFire])

  const isPlaying = gameState === 'playing' || gameState === 'warmup' || gameState === 'transition'
  const showTouchControls = isMobile && isPlaying

  return (
    <div className="frame">
      <HUD
        score={score}
        lives={lives}
        wave={wave}
        onLegendToggle={() => setLegendVisible(v => !v)}
        legendVisible={legendVisible}
      />
      <div className="game-area">
        <div className="gamewrap">
          <canvas ref={canvasRef} id="game" width={640} height={720} />
          {alertNode}
          <PowerupTray activePU={activePU} />

          {gameState === 'title' && (
            <>
              <TitleScreen topScore={topScore} onStart={startGame} />
              {competition && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                  <CompetitionBanner
                    competition={competition}
                    playerId={playerId}
                    isEntered={isEntered}
                    onEntered={refreshCompetition}
                  />
                </div>
              )}
            </>
          )}
          {gameState === 'gameover' && (
            <GameOver
              score={gameOverScore}
              wave={gameOverWave}
              onRestart={startGame}
              competition={competition}
              competitionLeaderboard={leaderboard}
              myCompetitionRow={myRow}
              playerId={playerId}
              isEnteredInCompetition={isEntered}
            />
          )}
          {gameState === 'paused' && <PauseScreen />}
        </div>

        {showTouchControls && (
          <TouchControls visible onKeyChange={handleTouchKey} onFire={handleTouchFire} />
        )}

        <Legend visible={legendVisible} />
      </div>
    </div>
  )
}
