'use client'
import { useEffect, useRef, useCallback } from 'react'
import { makeGameObj, initGame, loopTick, requestFire, setWarmupCallback } from '@/lib/game/engine'
import { render } from '@/lib/game/renderer'
import { ensureAudio } from '@/lib/game/audio'
import type { GameObj, UICallbacks } from '@/lib/game/types'

export interface GameLoopHandles {
  startGame: () => void
  togglePause: () => void
  triggerFire: () => void
  setKey: (key: string, down: boolean) => void
}

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  callbacks: UICallbacks,
): GameLoopHandles {
  const gameRef = useRef<GameObj>(makeGameObj())
  const keysRef = useRef<Record<string, boolean>>({})
  const cbRef = useRef<UICallbacks>(callbacks)
  cbRef.current = callbacks

  const startGame = useCallback(() => {
    ensureAudio()
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
          loopTick(gameRef.current, keysRef.current, cbRef.current)
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
