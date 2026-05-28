export type GameState = 'title' | 'warmup' | 'playing' | 'paused' | 'gameover' | 'transition'
export type EnemyType = 'DRONE' | 'CRED' | 'NHI' | 'AGENT' | 'LOTL' | 'SANCTIONED' | 'SCATTERED'
export type EnemyState = 'FORMATION' | 'DIVING' | 'LOTL_DISGUISED' | 'LOTL_REVEALED' | 'SCATTERED' | 'RETURNING'
export type PowerupKey = 'SHIELD' | 'GRAPH' | 'PAM' | 'OBSERV' | 'SWEEP' | 'SECRET'
export type PowerupKind = 'oneshot' | 'timed' | 'instant'

export interface Player {
  x: number; y: number; w: number; h: number; cooldown: number; hitFlash: number
}
export interface Bullet {
  x: number; y: number; vy: number; w: number; h: number; vx?: number; kind?: string
}
export interface Enemy {
  id: number
  type: EnemyType
  state: EnemyState
  x: number; y: number
  formX: number; formY: number
  w: number; h: number
  diveTime: number
  diveStart: { x: number; y: number } | null
  diveTarget: { x: number; y: number } | null
  fireCooldown: number
  parentId: number | null
  escortIds: number[]
  escortAssigned: boolean
  isLeavingAsEscort: boolean
  markedForRemoval?: boolean
  isSanctioned?: boolean
  spiderAngle?: number
}
export interface Powerup {
  x: number; y: number; vy: number; key: PowerupKey; w: number; h: number; age: number
}
export interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
export interface ActivePowerup { key: PowerupKey; ttl: number }
export interface SpiderRaid { startTime: number; timeLimit: number; killed: number }
export interface BgNode { x: number; y: number; speed: number; size: number; hue: string }
export interface WarmupTarget {
  id: string; label: string; color: string; glow: string
  x: number; y: number; w: number; h: number
  activated: boolean; activatedAt: number; bobPhase: number
}
export interface FlagshipCombo { escortsKilled: number; parentId: number | null }

export interface GameObj {
  state: GameState
  score: number; lives: number; wave: number
  shake: number; flash: number; bgOffset: number
  player: Player | null
  bullets: Bullet[]; enemyBullets: Bullet[]
  enemies: Enemy[]; powerups: Powerup[]
  particles: Particle[]
  spiderRaid: SpiderRaid | null
  diveTimer: number; spawnTimer: number; transitionTimer: number
  activePU: Record<string, ActivePowerup>
  flagshipComboCounter: FlagshipCombo
  warmupTargets: WarmupTarget[]
  warmupComplete: boolean; warmupCompletedAt: number
  bgNodes: BgNode[] | null
  firePending: boolean
  _spiderTriggeredOnWave: number | null
}

export interface Competition {
  id: string
  name: string
  prize_description: string | null
  banner_text: string | null
  starts_at: string
  ends_at: string
  active: boolean
}

export interface CompetitionLeaderboardRow {
  player_id: string
  handle: string
  first_name: string
  last_name: string
  best_score: number
  scores_count: number
  current_rank: number
  rank_delta: number | null
  new_today: boolean
}

export interface CachedScore {
  name: string; score: number; wave: number; streak_days: number; total_plays: number
}
export interface CachedPlayer {
  id: string; name: string; best_score: number
  streak_days: number; total_plays: number; last_played_date: string; token: string
}
export interface Badge { cls: string; label: string }

export interface UICallbacks {
  onHUDChange: (score: number, lives: number, wave: number) => void
  onStateChange: (state: GameState) => void
  onAlert: (text: string, ms?: number) => void
  onPUChange: (activePU: Record<string, ActivePowerup>) => void
  onGameOver: (score: number, wave: number) => void
}
