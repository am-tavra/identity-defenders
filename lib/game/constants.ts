import type { EnemyType, PowerupKey, PowerupKind } from './types'

export const CANVAS_W = 640
export const CANVAS_H = 720
export const TRUST_BOUNDARY_Y = 280
export const MAX_SCORES = 10
export const DISPLAY_COUNT = 5

export const STATE = {
  TITLE: 'title', WARMUP: 'warmup', PLAYING: 'playing',
  PAUSED: 'paused', GAMEOVER: 'gameover', TRANSITION: 'transition',
} as const

export const WARMUP_SYSTEMS = [
  { id: 'onprem', label: 'ON-PREM',  color: '#4FC3F7', glow: '#81D4FA' },
  { id: 'cloud',  label: 'CLOUD',    color: '#BA68C8', glow: '#CE93D8' },
  { id: 'human',  label: 'HUMAN',    color: '#81C784', glow: '#A5D6A7' },
  { id: 'nhi',    label: 'NHI',      color: '#FF7043', glow: '#FFAB91' },
  { id: 'ai',     label: 'AI AGENT', color: '#FFD54F', glow: '#FFE082' },
]

export const ENEMY: Record<EnemyType, {
  name: string; color: string; glow: string; formationPts: number; divePts: number
}> = {
  DRONE:      { name: 'Shadow IT',         color: '#4FC3F7', glow: '#81D4FA', formationPts: 30,   divePts: 60  },
  CRED:       { name: 'Compromised Cred',  color: '#BA68C8', glow: '#CE93D8', formationPts: 40,   divePts: 80  },
  NHI:        { name: 'Rogue NHI',         color: '#FF7043', glow: '#FFAB91', formationPts: 50,   divePts: 100 },
  AGENT:      { name: 'Rogue AI Agent',    color: '#FFD54F', glow: '#FFE082', formationPts: 60,   divePts: 150 },
  LOTL:       { name: 'LOTL Impostor',     color: '#66BB6A', glow: '#A5D6A7', formationPts: 0,    divePts: 200 },
  SANCTIONED: { name: 'Sanctioned User',   color: '#81C784', glow: '#C8E6C9', formationPts: -100, divePts: -100 },
  SCATTERED:  { name: 'Scattered Spider',  color: '#E94A88', glow: '#F48FB1', formationPts: 0,    divePts: 250 },
}

export const POWERUP: Record<PowerupKey, {
  key: PowerupKey; label: string; color: string; duration: number; kind: PowerupKind
}> = {
  SHIELD: { key: 'SHIELD', label: 'MFA SHIELD',     color: '#4FC3F7', duration: 0,   kind: 'oneshot'  },
  GRAPH:  { key: 'GRAPH',  label: 'IDENTITY GRAPH', color: '#BA68C8', duration: 600, kind: 'timed'    },
  PAM:    { key: 'PAM',    label: 'PRIV ACCESS',    color: '#FFD54F', duration: 480, kind: 'timed'    },
  OBSERV: { key: 'OBSERV', label: 'OBSERV BOOST',   color: '#FF6B4A', duration: 900, kind: 'timed'    },
  SWEEP:  { key: 'SWEEP',  label: 'ITDR SWEEP',     color: '#E94A88', duration: 0,   kind: 'instant'  },
  SECRET: { key: 'SECRET', label: 'ROTATE SECRET',  color: '#81C784', duration: 0,   kind: 'instant'  },
}
