'use client'
import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { makeGameObj, initGame, loopTick, requestFire, setWarmupCallback } from '@/lib/game/engine'
import { render } from '@/lib/game/renderer'
import { ensureAudio } from '@/lib/game/audio'
import { startSession, track } from '@/hooks/useLeaderboard'
import type { GameObj, UICallbacks, GameResult } from '@/lib/game/types'

export interface GameLoopHandles {
  startGame: () => void
  togglePause: () => void
  triggerFire: () => void
  setKey: (key: string, down: boolean) => void
}

// What the UI receives: the engine callbacks, with game over carrying the session id
export type LoopCallbacks = Omit<UICallbacks, 'onGameOver' | 'onQuarterComplete'> & {
  onGameOver: (result: GameResult) => void
}

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  callbacks: LoopCallbacks,
): GameLoopHandles {
  const gameRef = useRef<GameObj>(makeGameObj())
  const keysRef = useRef<Record<string, boolean>>({})
  const cbRef = useRef<LoopCallbacks>(callbacks)
  useLayoutEffect(() => { cbRef.current = callbacks })

  // Server-issued id for the current game; the score submission must reference it
  const sessionRef = useRef<string | null>(null)
  const engineCb = useRef<UICallbacks>({
    onHUDChange: (...a) => cbRef.current.onHUDChange(...a),
    onStateChange: s => cbRef.current.onStateChange(s),
    onAlert: (t, ms) => cbRef.current.onAlert(t, ms),
    onPUChange: pu => cbRef.current.onPUChange(pu),
    onQuarterComplete: (wave, score, lives) => {
      track('quarter_end', { quarter: wave, score, lives }, sessionRef.current)
    },
    onGameOver: (score, wave) => {
      track('game_over', { score, quarter: wave }, sessionRef.current)
      cbRef.current.onGameOver({ score, wave, sessionId: sessionRef.current })
    },
  })

  const startGame = useCallback(() => {
    ensureAudio()
    sessionRef.current = null
    startSession().then(id => { sessionRef.current = id })
    initGame(gameRef.current)
    cbRef.current.onStateChange(gameRef.current.state)
    cbRef.current.onHUDChange(0, 3, 1)
    cbRef.current.onPUChange({})
  }, [])

  const togglePause = useCallback(() => {
    const g = gameRef.current
    if (g.state === 'playing') { g.state = 'paused'; cbRef.current.onStateChange('paused') }
    else if (g.state === 'paused') { g.state = 'playing'; cbRef.current.onStateChange('playing') }
  }, [])

  // Exposed for touch controls
  const triggerFire = useCallback(() => { requestFire(gameRef.current) }, [])
  const setKey = useCallback((key: string, down: boolean) => { keysRef.current[key] = down }, [])

  useEffect(() => {
    setWarmupCallback((label: string) => cbRef.current.onAlert(`✓ ${label} · ONLINE`, 1000))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) return
      keysRef.current[e.key.toLowerCase()] = true
      if (e.key === ' ') { e.preventDefault(); requestFire(gameRef.current) }
      if (e.key.toLowerCase() === 'p') togglePause()
      if (e.key === 'Enter' && (gameRef.current.state === 'title' || gameRef.current.state === 'gameover')) startGame()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) return
      keysRef.current[e.key.toLowerCase()] = false
      if (e.key === ' ') gameRef.current.firePending = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    let rafId: number
    const tick = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          loopTick(gameRef.current, keysRef.current, engineCb.current)
          render(ctx, gameRef.current)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(rafId)
    }
  }, [canvasRef, startGame, togglePause])

  return { startGame, togglePause, triggerFire, setKey }
}
