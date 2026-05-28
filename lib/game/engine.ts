import { CANVAS_W, CANVAS_H, TRUST_BOUNDARY_Y, ENEMY, POWERUP, WARMUP_SYSTEMS } from './constants'
import { ensureAudio, sfxShoot, sfxHit, sfxPlayerHit, sfxAlert, sfxPowerUp, sfxFlagshipBig } from './audio'
import type { GameObj, Enemy, UICallbacks, PowerupKey } from './types'

// ── Helpers ──────────────────────────────────────────────────────────────────
export function rand(a: number, b: number) { return a + Math.random() * (b - a) }
export function chance(p: number) { return Math.random() < p }
export function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)) }
export function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy
}
export function isPUActive(game: GameObj, key: string) { return !!game.activePU[key] }
export function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// ── Initial game state ────────────────────────────────────────────────────────
export function makeGameObj(): GameObj {
  return {
    state: 'title', score: 0, lives: 3, wave: 1,
    shake: 0, flash: 0, bgOffset: 0,
    player: null, bullets: [], enemyBullets: [],
    enemies: [], powerups: [], particles: [],
    spiderRaid: null, diveTimer: 0, spawnTimer: 0, transitionTimer: 0,
    activePU: {},
    flagshipComboCounter: { escortsKilled: 0, parentId: null },
    warmupTargets: [], warmupComplete: false, warmupCompletedAt: 0,
    bgNodes: null, firePending: false, _spiderTriggeredOnWave: null,
  }
}

// ── Player ────────────────────────────────────────────────────────────────────
export function createPlayer() {
  return { x: CANVAS_W / 2, y: CANVAS_H - 60, w: 32, h: 22, cooldown: 0, hitFlash: 0 }
}

export function requestFire(game: GameObj) { game.firePending = true }

export function tryFire(game: GameObj) {
  if (game.state !== 'playing' && game.state !== 'warmup') return
  if (!game.firePending || !game.player) return
  if (game.player.cooldown > 0) return
  const maxBullets = isPUActive(game, 'PAM') ? 3 : 1
  if (game.bullets.length >= maxBullets) return
  ensureAudio()
  game.bullets.push({ x: game.player.x, y: game.player.y - 12, vy: -20, w: 3, h: 16 })
  game.player.cooldown = isPUActive(game, 'PAM') ? 4 : 0
  game.firePending = false
  sfxShoot()
}

export function updatePlayer(game: GameObj, keys: Record<string, boolean>) {
  const p = game.player
  if (!p) return
  const speed = 4.2
  if (keys['arrowleft'] || keys['a']) p.x -= speed
  if (keys['arrowright'] || keys['d']) p.x += speed
  p.x = clamp(p.x, p.w / 2 + 6, CANVAS_W - p.w / 2 - 6)
  if (p.cooldown > 0) p.cooldown--
  if (p.hitFlash > 0) p.hitFlash--
}

// ── Formation ─────────────────────────────────────────────────────────────────
let nextEnemyId = 1
let formationOffsetX = 0
let formationDir = 1

export function resetFormationState() { nextEnemyId = 1; formationOffsetX = 0; formationDir = 1 }

export function updateFormation(game: GameObj) {
  formationOffsetX += formationDir * (0.4 + game.wave * 0.05)
  if (Math.abs(formationOffsetX) > 30) formationDir *= -1
}

export function buildWave(game: GameObj, waveNum: number) {
  game.enemies = []
  const cols = 10, colSpacing = 50, rowSpacing = 38
  const startX = (CANVAS_W - (cols - 1) * colSpacing) / 2
  const startY = 90

  for (let c = 3; c <= 6; c++) addFormationEnemy(game, 'AGENT', c, 0, startX, startY, colSpacing, rowSpacing)
  for (let c = 2; c <= 7; c++) addFormationEnemy(game, 'NHI', c, 1, startX, startY, colSpacing, rowSpacing)
  for (let r = 2; r <= 3; r++)
    for (let c = 1; c <= 8; c++) addFormationEnemy(game, 'CRED', c, r, startX, startY, colSpacing, rowSpacing)
  const blueRows = Math.max(1, 2 - Math.floor((waveNum - 1) / 3))
  for (let r = 4; r < 4 + blueRows; r++)
    for (let c = 0; c < cols; c++) addFormationEnemy(game, 'DRONE', c, r, startX, startY, colSpacing, rowSpacing)

  const flagships = game.enemies.filter(e => e.type === 'AGENT')
  const nhis = game.enemies.filter(e => e.type === 'NHI')
  flagships.forEach(f => {
    nhis.sort((a, b) => dist2(a.formX, a.formY, f.formX, f.formY) - dist2(b.formX, b.formY, f.formX, f.formY))
    f.escortIds = nhis.slice(0, 2).filter(n => !n.escortAssigned).map(n => { n.escortAssigned = true; n.parentId = f.id; return n.id })
  })
}

function addFormationEnemy(
  game: GameObj, typeKey: Enemy['type'],
  col: number, row: number,
  startX: number, startY: number, colSpacing: number, rowSpacing: number
) {
  const x = startX + col * colSpacing
  const y = startY + row * rowSpacing
  game.enemies.push({
    id: nextEnemyId++, type: typeKey, state: 'FORMATION',
    formX: x, formY: y, x, y, w: 24, h: 20,
    diveTime: 0, diveStart: null, diveTarget: null,
    fireCooldown: rand(80, 200), parentId: null,
    escortIds: [], escortAssigned: false, isLeavingAsEscort: false,
  })
}

// ── Enemies ───────────────────────────────────────────────────────────────────
export function updateEnemies(game: GameObj, cb: UICallbacks) {
  game.enemies.forEach(e => {
    if (e.state === 'FORMATION') {
      e.x = e.formX + formationOffsetX
      e.y = e.formY + Math.sin(performance.now() / 600 + e.formX) * 2
      if (game.wave >= 2 && chance(0.0003)) shootFromEnemy(game, e)
    } else if (e.state === 'DIVING') {
      updateDivingEnemy(game, e)
    } else if (e.state === 'LOTL_DISGUISED') {
      updateLOTL(game, e, cb)
    } else if (e.state === 'LOTL_REVEALED') {
      updateDivingEnemy(game, e)
    } else if (e.state === 'SCATTERED') {
      updateScatteredSpider(game, e)
    } else if (e.state === 'RETURNING') {
      updateReturning(e)
    }
  })
  game.enemies = game.enemies.filter(e => e.x > -50 && e.x < CANVAS_W + 50 && e.y < CANVAS_H + 60)
}

function updateDivingEnemy(game: GameObj, e: Enemy) {
  e.diveTime++
  const divisor = (e.type === 'AGENT' || e.type === 'NHI') ? 180 : 110
  const accel = (e.type === 'AGENT' || e.type === 'NHI') ? 28 : 60
  const t = e.diveTime / divisor
  if (!e.diveStart || !e.diveTarget) return
  const swayAmp = e.type === 'CRED' ? 80 : 40
  const sway = Math.sin(t * Math.PI * (e.type === 'CRED' ? 3 : 1.5)) * swayAmp
  e.x = e.diveStart.x + (e.diveTarget.x - e.diveStart.x) * t + sway
  e.y = e.diveStart.y + (e.diveTarget.y - e.diveStart.y) * t + accel * t * t
  e.fireCooldown--
  if (e.fireCooldown <= 0 && e.y < CANVAS_H - 80) {
    shootFromEnemy(game, e); e.fireCooldown = rand(30, 80)
  }
  if (e.y > CANVAS_H + 30) {
    if (chance(0.7) && e.type !== 'LOTL') {
      e.state = 'RETURNING'; e.x = e.formX; e.y = -30
    } else { e.markedForRemoval = true }
  }
}

function updateLOTL(game: GameObj, e: Enemy, cb: UICallbacks) {
  e.y += 0.7
  e.x += Math.sin(performance.now() / 800 + e.id) * 0.5
  if (e.isSanctioned) { if (e.y > CANVAS_H + 30) e.markedForRemoval = true; return }
  if (isPUActive(game, 'GRAPH')) { if (e.y > 120) revealLOTL(game, e, cb) }
  else if (e.y > TRUST_BOUNDARY_Y) { revealLOTL(game, e, cb) }
}

function revealLOTL(game: GameObj, e: Enemy, _cb: UICallbacks) {
  e.state = 'LOTL_REVEALED'
  e.diveStart = { x: e.x, y: e.y }
  e.diveTime = 0
  e.diveTarget = { x: clamp(game.player!.x + rand(-100, 100), 40, CANVAS_W - 40), y: CANVAS_H + 30 }
  spawnParticles(game, e.x, e.y, 8, '#E53935')
}

function updateReturning(e: Enemy) {
  e.y += 2.5
  if (e.y >= e.formY) { e.y = e.formY; e.state = 'FORMATION' }
}

function updateScatteredSpider(game: GameObj, e: Enemy) {
  if (e.spiderAngle === undefined) e.spiderAngle = 0
  e.spiderAngle += 0.018
  e.x = CANVAS_W / 2 + Math.cos(e.spiderAngle) * (220 + Math.sin(e.spiderAngle * 2) * 20)
  e.y = 260 + Math.sin(e.spiderAngle) * 110
  e.fireCooldown--
  if (e.fireCooldown <= 0) { shootFromEnemy(game, e, 'fatigue'); e.fireCooldown = rand(40, 90) }
}

function shootFromEnemy(game: GameObj, e: Enemy, kind = 'normal') {
  game.enemyBullets.push({
    x: e.x, y: e.y + 10,
    vx: kind === 'fatigue' ? rand(-1, 1) : 0,
    vy: kind === 'fatigue' ? 4.5 : 3.5 + game.wave * 0.1,
    w: 3, h: 8, kind,
  })
}

// ── Dive trigger ──────────────────────────────────────────────────────────────
export function tryTriggerDive(game: GameObj) {
  game.diveTimer--
  if (game.diveTimer > 0) return
  game.diveTimer = clamp(140 - game.wave * 8, 50, 140)
  const idle = game.enemies.filter(e => e.state === 'FORMATION')
  if (idle.length === 0) return
  const flagship = idle.find(e => e.type === 'AGENT' && Math.random() < 0.4)
  if (flagship && flagship.escortIds.length > 0) {
    launchDive(game, flagship)
    flagship.escortIds.forEach(eid => {
      const escort = game.enemies.find(en => en.id === eid && en.state === 'FORMATION')
      if (escort) { escort.isLeavingAsEscort = true; launchDive(game, escort, flagship) }
    })
    game.flagshipComboCounter = { escortsKilled: 0, parentId: flagship.id }
  } else {
    launchDive(game, idle[Math.floor(Math.random() * idle.length)])
  }
}

function launchDive(game: GameObj, e: Enemy, leader?: Enemy) {
  e.state = 'DIVING'; e.diveStart = { x: e.x, y: e.y }
  e.diveTime = 0; e.fireCooldown = rand(20, 60)
  let tx = game.player!.x + rand(-80, 80)
  if (leader) tx += rand(-30, 30)
  e.diveTarget = { x: clamp(tx, 40, CANVAS_W - 40), y: CANVAS_H + 30 }
}

// ── Special spawns ────────────────────────────────────────────────────────────
export function tryTriggerSpecial(game: GameObj) {
  game.spawnTimer--
  if (game.spawnTimer > 0) return
  game.spawnTimer = rand(220, 360)
  if (chance(0.55) && game.wave >= 1) spawnLOTL(game)
  else spawnSanctioned(game)
}

function spawnLOTL(game: GameObj) {
  game.enemies.push({
    id: nextEnemyId++, type: 'LOTL', state: 'LOTL_DISGUISED',
    x: rand(60, CANVAS_W - 60), y: -20, formX: 0, formY: 0, w: 22, h: 20,
    diveTime: 0, diveStart: null, diveTarget: null, fireCooldown: 80,
    parentId: null, escortIds: [], escortAssigned: false, isLeavingAsEscort: false,
    isSanctioned: false,
  })
}

function spawnSanctioned(game: GameObj) {
  game.enemies.push({
    id: nextEnemyId++, type: 'SANCTIONED', state: 'LOTL_DISGUISED',
    x: rand(60, CANVAS_W - 60), y: -20, formX: 0, formY: 0, w: 22, h: 20,
    diveTime: 0, diveStart: null, diveTarget: null, fireCooldown: 9999,
    parentId: null, escortIds: [], escortAssigned: false, isLeavingAsEscort: false,
    isSanctioned: true,
  })
}

// ── Scattered Spider raid ─────────────────────────────────────────────────────
export function maybeTriggerSpiderRaid(game: GameObj, cb: UICallbacks) {
  if (game.spiderRaid) return
  if (game.wave < 4 || (game.wave - 4) % 4 !== 0) return
  if (game._spiderTriggeredOnWave === game.wave) return
  game._spiderTriggeredOnWave = game.wave
  cb.onAlert('⚠ HELP DESK VISHING DETECTED')
  sfxAlert()
  setTimeout(() => {
    if (game.state !== 'playing') return
    game.spiderRaid = { startTime: performance.now(), timeLimit: 8500, killed: 0 }
    for (let i = 0; i < 5; i++) {
      game.enemies.push({
        id: nextEnemyId++, type: 'SCATTERED', state: 'SCATTERED',
        x: CANVAS_W / 2 + Math.cos(i * Math.PI * 0.4) * 220, y: 260,
        formX: 0, formY: 0, w: 22, h: 20,
        spiderAngle: i * Math.PI * 0.4, fireCooldown: rand(60, 120),
        diveTime: 0, diveStart: null, diveTarget: null,
        parentId: null, escortIds: [], escortAssigned: false, isLeavingAsEscort: false,
      })
    }
  }, 1500)
}

export function updateSpiderRaid(game: GameObj, cb: UICallbacks) {
  if (!game.spiderRaid) return
  const elapsed = performance.now() - game.spiderRaid.startTime
  const remaining = game.spiderRaid.timeLimit - elapsed
  const alive = game.enemies.filter(e => e.type === 'SCATTERED' && !e.markedForRemoval)
  if (alive.length === 0) {
    game.score += 2000 * (isPUActive(game, 'OBSERV') ? 2 : 1)
    cb.onAlert('★ THREAT CONTAINED +2000')
    sfxFlagshipBig()
    dropPowerup(game, CANVAS_W / 2, CANVAS_H / 2, 'PAM')
    game.spiderRaid = null; return
  }
  if (remaining < 0) {
    cb.onAlert('✕ RAID ESCAPED — DWELL TIME ACCRUED')
    alive.forEach(e => e.markedForRemoval = true)
    game.spiderRaid = null
    Object.keys(game.activePU).forEach(k => { if (POWERUP[k as PowerupKey].kind === 'timed') delete game.activePU[k] })
    return
  }
  if (alive.length < 5 && game.spiderRaid.killed < 8 && chance(0.012)) {
    game.enemies.push({
      id: nextEnemyId++, type: 'SCATTERED', state: 'SCATTERED',
      x: chance(0.5) ? -20 : CANVAS_W + 20, y: rand(200, 320),
      formX: 0, formY: 0, w: 22, h: 20,
      spiderAngle: rand(0, Math.PI * 2), fireCooldown: rand(60, 120),
      diveTime: 0, diveStart: null, diveTarget: null,
      parentId: null, escortIds: [], escortAssigned: false, isLeavingAsEscort: false,
    })
  }
}

// ── Powerups ──────────────────────────────────────────────────────────────────
export function dropPowerup(game: GameObj, x: number, y: number, forceKey: PowerupKey | null = null) {
  const allKeys: PowerupKey[] = ['SHIELD', 'GRAPH', 'PAM', 'OBSERV', 'SWEEP', 'SECRET']
  const key = forceKey || allKeys[Math.floor(Math.random() * allKeys.length)]
  game.powerups.push({ x, y, vy: 1.4, key, w: 18, h: 18, age: 0 })
}

export function updatePowerups(game: GameObj, cb: UICallbacks) {
  game.powerups.forEach(p => { p.y += p.vy; p.age++ })
  game.powerups = game.powerups.filter(p => p.y < CANVAS_H + 30)
  Object.keys(game.activePU).forEach(k => {
    const pu = game.activePU[k]
    if (pu.ttl > 0) { pu.ttl--; if (pu.ttl <= 0) delete game.activePU[k] }
  })
  cb.onPUChange({ ...game.activePU })
}

function collectPowerup(game: GameObj, p: typeof game.powerups[0], cb: UICallbacks) {
  const def = POWERUP[p.key]
  sfxPowerUp()
  spawnParticles(game, p.x, p.y, 14, def.color)
  if (def.kind === 'instant') {
    if (p.key === 'SECRET') { game.lives = Math.min(game.lives + 1, 5); cb.onAlert('+1 SENTINEL') }
    else if (p.key === 'SWEEP') {
      let cleared = 0
      game.enemies.forEach(e => {
        if (e.state === 'DIVING' || e.state === 'LOTL_REVEALED' || e.state === 'SCATTERED') {
          e.markedForRemoval = true; spawnParticles(game, e.x, e.y, 8, ENEMY[e.type].color); cleared++
        }
      })
      game.enemyBullets = []
      cb.onAlert(`ITDR SWEEP · ${cleared} CLEARED`)
      game.flash = 8
    }
  } else if (def.kind === 'oneshot') {
    game.activePU[p.key] = { key: p.key, ttl: -1 }
    cb.onAlert('MFA SHIELD ARMED')
  } else if (def.kind === 'timed') {
    game.activePU[p.key] = { key: p.key, ttl: def.duration }
    cb.onAlert(`${def.label} ACTIVE`)
  }
}

// ── Collisions ────────────────────────────────────────────────────────────────
export function checkCollisions(game: GameObj, cb: UICallbacks) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i]
    for (let j = 0; j < game.enemies.length; j++) {
      const e = game.enemies[j]
      if (e.markedForRemoval) continue
      if (rectsOverlap(b.x - 1.5, b.y, 3, 12, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
        handleEnemyHit(game, e, cb); game.bullets.splice(i, 1); break
      }
    }
  }
  if (game.player) {
    for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
      const b = game.enemyBullets[i]; const p = game.player
      if (rectsOverlap(b.x - 1.5, b.y, 3, 8, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h)) {
        game.enemyBullets.splice(i, 1); playerHit(game, cb)
      }
    }
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i]; const p = game.player
      if (e.markedForRemoval || e.state === 'FORMATION' || e.state === 'LOTL_DISGUISED') continue
      if (rectsOverlap(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h)) {
        e.markedForRemoval = true; spawnParticles(game, e.x, e.y, 10, ENEMY[e.type].color); playerHit(game, cb)
      }
    }
    for (let i = game.powerups.length - 1; i >= 0; i--) {
      const pu = game.powerups[i]; const p = game.player
      if (rectsOverlap(pu.x - pu.w / 2, pu.y - pu.h / 2, pu.w, pu.h, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h)) {
        collectPowerup(game, pu, cb); game.powerups.splice(i, 1)
      }
    }
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const b = game.bullets[i]
      for (let j = game.powerups.length - 1; j >= 0; j--) {
        const pu = game.powerups[j]
        if (rectsOverlap(b.x - 1.5, b.y, 3, 12, pu.x - pu.w / 2, pu.y - pu.h / 2, pu.w, pu.h)) {
          collectPowerup(game, pu, cb); game.powerups.splice(j, 1); game.bullets.splice(i, 1); break
        }
      }
    }
  }
  game.enemies = game.enemies.filter(e => !e.markedForRemoval)
}

function handleEnemyHit(game: GameObj, e: Enemy, cb: UICallbacks) {
  ensureAudio()
  if (e.type === 'SANCTIONED') {
    game.score = Math.max(0, game.score - 200)
    cb.onAlert('✕ FALSE POSITIVE — SANCTIONED USER')
    spawnParticles(game, e.x, e.y, 8, '#A5D6A7')
    e.markedForRemoval = true; sfxHit(); return
  }
  const def = ENEMY[e.type]
  let pts: number
  if (e.type === 'AGENT') { pts = scoreAgentKill(game, e, cb) }
  else { pts = (e.state === 'FORMATION') ? def.formationPts : def.divePts }
  if (e.type === 'LOTL' && e.state === 'LOTL_DISGUISED') { pts = 300; cb.onAlert('★ LOTL CAUGHT EARLY +300') }
  if (isPUActive(game, 'OBSERV')) pts *= 2
  game.score += pts
  if (e.type === 'NHI' && e.parentId && game.flagshipComboCounter.parentId === e.parentId) {
    game.flagshipComboCounter.escortsKilled++
  }
  spawnParticles(game, e.x, e.y, 10, def.color); sfxHit(); e.markedForRemoval = true
  if (e.type === 'SCATTERED' && game.spiderRaid) game.spiderRaid.killed++
  if (e.type === 'AGENT' && pts >= 300) dropPowerup(game, e.x, e.y)
  else if (e.type === 'LOTL' && pts === 300) dropPowerup(game, e.x, e.y, chance(0.5) ? 'GRAPH' : null)
  else if (chance(0.04)) dropPowerup(game, e.x, e.y)
}

function scoreAgentKill(game: GameObj, e: Enemy, cb: UICallbacks): number {
  const def = ENEMY.AGENT
  if (e.state === 'FORMATION') return def.formationPts
  const myEscorts = (e.escortIds || []).map(id => game.enemies.find(en => en.id === id))
  const escortsAlive = myEscorts.filter(en => en && !en.markedForRemoval).length
  const escortsKilledFirst = game.flagshipComboCounter.parentId === e.id ? game.flagshipComboCounter.escortsKilled : 0
  if (myEscorts.length === 0 || (escortsAlive === 0 && escortsKilledFirst === 0)) return 150
  if (escortsKilledFirst >= 2) {
    cb.onAlert('★★ COMBO +800 — ROGUE AI NEUTRALIZED'); sfxFlagshipBig(); game.flash = 10; return 800
  } else if (escortsAlive === 1) return 200
  else if (escortsAlive === 2) return 300
  return 150
}

function playerHit(game: GameObj, cb: UICallbacks) {
  if (isPUActive(game, 'SHIELD')) {
    delete game.activePU.SHIELD
    spawnParticles(game, game.player!.x, game.player!.y, 20, '#4FC3F7')
    cb.onAlert('MFA SHIELD ABSORBED HIT'); sfxHit(); return
  }
  game.lives--; game.player!.hitFlash = 30; game.shake = 12
  sfxPlayerHit(); spawnParticles(game, game.player!.x, game.player!.y, 24, '#FF6B4A')
  if (game.lives <= 0) { cb.onGameOver(game.score, game.wave) }
  else { game.player!.x = CANVAS_W / 2 }
}

// ── Particles ─────────────────────────────────────────────────────────────────
export function spawnParticles(game: GameObj, x: number, y: number, count: number, color: string) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = rand(1, 4)
    game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(20, 40), maxLife: 40, color, size: rand(1.5, 3) })
  }
}

export function updateParticles(game: GameObj) {
  game.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life-- })
  game.particles = game.particles.filter(p => p.life > 0)
}

export function updateEnemyBullets(game: GameObj) {
  game.enemyBullets.forEach(b => { b.x += (b.vx || 0); b.y += b.vy })
  game.enemyBullets = game.enemyBullets.filter(b => b.y < CANVAS_H + 20 && b.x > -10 && b.x < CANVAS_W + 10)
}

// ── Warmup ────────────────────────────────────────────────────────────────────
export function buildWarmup(game: GameObj) {
  game.warmupTargets = WARMUP_SYSTEMS.map((sys, i) => ({
    ...sys, x: 70 + i * 125, y: 320, w: 60, h: 60,
    activated: false, activatedAt: 0, bobPhase: i * 0.5,
  }))
  game.warmupComplete = false; game.warmupCompletedAt = 0
}

export function updateWarmup(game: GameObj, cb: UICallbacks) {
  game.warmupTargets.forEach(t => { t.bobPhase += 0.025 })
  if (!game.warmupComplete && game.warmupTargets.every(t => t.activated)) {
    game.warmupComplete = true; game.warmupCompletedAt = performance.now()
    cb.onAlert('★ FULL VISIBILITY ENABLED ★', 2200); sfxFlagshipBig()
    setTimeout(() => { if (game.state === 'warmup') { game.state = 'playing'; buildWave(game, 1) } }, 1900)
  }
}

export function checkWarmupCollisions(game: GameObj) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i]
    for (let j = 0; j < game.warmupTargets.length; j++) {
      const t = game.warmupTargets[j]
      if (t.activated) continue
      const ty = t.y + Math.sin(t.bobPhase) * 5
      if (rectsOverlap(b.x - 1.5, b.y, 3, 14, t.x - t.w / 2, ty - t.h / 2, t.w, t.h)) {
        t.activated = true; t.activatedAt = performance.now()
        spawnParticles(game, t.x, ty, 16, t.color); sfxPowerUp()
        cb_warmupActivate(t.label)
        game.bullets.splice(i, 1); break
      }
    }
  }
}

// Will be set by the hook
let cb_warmupActivate: (label: string) => void = () => {}
export function setWarmupCallback(fn: (label: string) => void) { cb_warmupActivate = fn }

// ── Wave transition ───────────────────────────────────────────────────────────
export function checkWaveComplete(game: GameObj, cb: UICallbacks) {
  if (game.state !== 'playing') return
  if (game.spiderRaid) return
  const formationCount = game.enemies.filter(e => e.state === 'FORMATION').length
  const inFlightThreats = game.enemies.filter(e =>
    e.state === 'DIVING' || e.state === 'LOTL_REVEALED' || e.state === 'RETURNING' || e.state === 'SCATTERED'
  ).length
  if (formationCount === 0 && inFlightThreats === 0) advanceWave(game, cb)
}

function advanceWave(game: GameObj, cb: UICallbacks) {
  game.state = 'transition'; game.transitionTimer = 120; game.wave++
  cb.onAlert(`QUARTER ${game.wave} INCOMING`)
  game.score += game.lives * 100
  setTimeout(() => {
    if (game.state === 'transition') {
      buildWave(game, game.wave); maybeTriggerSpiderRaid(game, cb); game.state = 'playing'
    }
  }, 2000)
}

// ── Start / reset ─────────────────────────────────────────────────────────────
export function initGame(game: GameObj) {
  game.score = 0; game.lives = 3; game.wave = 1
  game.bullets = []; game.enemyBullets = []; game.enemies = []
  game.powerups = []; game.particles = []; game.activePU = {}
  game.spiderRaid = null; game._spiderTriggeredOnWave = null
  game.diveTimer = 80; game.spawnTimer = 300; game.firePending = false
  game.player = createPlayer()
  buildWarmup(game)
  game.state = 'warmup'
  resetFormationState()
}

// ── Main loop tick ────────────────────────────────────────────────────────────
export function loopTick(game: GameObj, keys: Record<string, boolean>, cb: UICallbacks) {
  if (game.state === 'playing') {
    updatePlayer(game, keys)
    game.bullets.forEach(b => { b.y += b.vy })
    game.bullets = game.bullets.filter(b => b.y > -20)
    tryFire(game)
    updateFormation(game)
    updateEnemies(game, cb)
    updateEnemyBullets(game)
    updatePowerups(game, cb)
    updateParticles(game)
    tryTriggerDive(game)
    tryTriggerSpecial(game)
    updateSpiderRaid(game, cb)
    checkCollisions(game, cb)
    checkWaveComplete(game, cb)
    cb.onHUDChange(game.score, game.lives, game.wave)
  } else if (game.state === 'warmup') {
    updatePlayer(game, keys)
    game.bullets.forEach(b => { b.y += b.vy })
    game.bullets = game.bullets.filter(b => b.y > -20)
    tryFire(game)
    updateWarmup(game, cb)
    checkWarmupCollisions(game)
    updateParticles(game)
    cb.onHUDChange(game.score, game.lives, game.wave)
  } else if (game.state === 'transition') {
    updateParticles(game)
  }
}
