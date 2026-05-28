import { CANVAS_W, CANVAS_H, TRUST_BOUNDARY_Y, ENEMY, POWERUP } from './constants'
import type { GameObj, Enemy, Bullet, Powerup, Particle, WarmupTarget } from './types'

function isPUActive(game: GameObj, key: string) { return !!game.activePU[key] }

export function render(ctx: CanvasRenderingContext2D, game: GameObj) {
  ctx.fillStyle = '#0a0f24'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  drawBackground(ctx, game)

  const sx = (Math.random() - 0.5) * game.shake
  const sy = (Math.random() - 0.5) * game.shake
  ctx.save()
  ctx.translate(sx, sy)
  if (game.shake > 0) game.shake *= 0.85

  drawTrustBoundary(ctx, game)
  drawParticles(ctx, game.particles)

  if (game.state === 'warmup') drawWarmup(ctx, game)

  game.enemies.forEach(e => drawEnemy(ctx, e, game))
  game.powerups.forEach(p => drawPowerup(ctx, p))
  game.bullets.forEach(b => drawBullet(ctx, b, '#E6ECFF', '#B3E5FC'))
  game.enemyBullets.forEach(b =>
    drawBullet(ctx, b,
      b.kind === 'fatigue' ? '#E94A88' : '#FF7043',
      b.kind === 'fatigue' ? '#F48FB1' : '#FFAB91'
    )
  )
  drawPlayer(ctx, game)
  ctx.restore()

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.08})`
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    game.flash--
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, game: GameObj) {
  game.bgOffset += 0.3
  ctx.strokeStyle = 'rgba(120,140,220,0.06)'
  ctx.lineWidth = 1
  const gs = 40
  const off = game.bgOffset % gs
  for (let x = 0; x < CANVAS_W; x += gs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
  }
  for (let y = -gs + off; y < CANVAS_H; y += gs) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
  }
  if (!game.bgNodes) {
    game.bgNodes = []
    const hues = ['#4FC3F7', '#BA68C8', '#FFD54F', '#FF6B4A']
    for (let i = 0; i < 24; i++) {
      game.bgNodes.push({
        x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
        speed: 0.2 + Math.random() * 0.5,
        size: 1 + Math.random() * 1.5,
        hue: hues[Math.floor(Math.random() * 4)],
      })
    }
  }
  game.bgNodes.forEach(n => {
    n.y += n.speed
    if (n.y > CANVAS_H + 4) { n.y = -4; n.x = Math.random() * CANVAS_W }
    ctx.fillStyle = n.hue
    ctx.globalAlpha = 0.25
    ctx.beginPath(); ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  })
}

function drawTrustBoundary(ctx: CanvasRenderingContext2D, game: GameObj) {
  if (isPUActive(game, 'GRAPH')) {
    ctx.strokeStyle = 'rgba(186,104,200,0.4)'
    ctx.setLineDash([8, 6])
  } else {
    ctx.strokeStyle = 'rgba(120,140,220,0.08)'
    ctx.setLineDash([4, 8])
  }
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, TRUST_BOUNDARY_Y); ctx.lineTo(CANVAS_W, TRUST_BOUNDARY_Y); ctx.stroke()
  ctx.setLineDash([])
  if (isPUActive(game, 'GRAPH')) {
    ctx.fillStyle = 'rgba(186,104,200,0.7)'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.fillText('// TRUST BOUNDARY · GRAPH ACTIVE', 12, TRUST_BOUNDARY_Y - 6)
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, game: GameObj) {
  const def = ENEMY[e.type]
  let color = def.color
  let glow = def.glow
  if (e.state === 'LOTL_DISGUISED' && !e.isSanctioned) {
    if (isPUActive(game, 'GRAPH')) { color = '#E53935'; glow = '#FF7043' }
    else { color = '#66BB6A'; glow = '#A5D6A7' }
  }
  if (e.type === 'SANCTIONED') { color = '#81C784'; glow = '#C8E6C9' }

  ctx.save()
  ctx.shadowColor = glow
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.beginPath()

  if (e.type === 'AGENT') {
    ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x + 12, e.y)
    ctx.lineTo(e.x, e.y + 12); ctx.lineTo(e.x - 12, e.y)
    ctx.closePath(); ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0a0f24'
    ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(e.x, e.y, 2, 0, Math.PI * 2); ctx.fill()
  } else if (e.type === 'NHI') {
    ctx.moveTo(e.x, e.y - 10); ctx.lineTo(e.x + 11, e.y + 8)
    ctx.lineTo(e.x, e.y + 3); ctx.lineTo(e.x - 11, e.y + 8)
    ctx.closePath(); ctx.fill()
  } else if (e.type === 'CRED') {
    ctx.moveTo(e.x - 10, e.y - 4); ctx.lineTo(e.x - 5, e.y - 9)
    ctx.lineTo(e.x + 5, e.y - 9); ctx.lineTo(e.x + 10, e.y - 4)
    ctx.lineTo(e.x + 5, e.y + 9); ctx.lineTo(e.x - 5, e.y + 9)
    ctx.closePath(); ctx.fill()
  } else if (e.type === 'DRONE') {
    ctx.moveTo(e.x, e.y - 9); ctx.lineTo(e.x + 10, e.y + 8)
    ctx.lineTo(e.x - 10, e.y + 8); ctx.closePath(); ctx.fill()
  } else if (e.type === 'LOTL') {
    if (e.state === 'LOTL_DISGUISED') {
      ctx.arc(e.x, e.y, 9, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#0a0f24'; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(e.x - 3, e.y); ctx.lineTo(e.x - 1, e.y + 3); ctx.lineTo(e.x + 4, e.y - 3)
      ctx.stroke()
    } else {
      ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x + 6, e.y - 4)
      ctx.lineTo(e.x + 12, e.y); ctx.lineTo(e.x + 4, e.y + 6)
      ctx.lineTo(e.x, e.y + 12); ctx.lineTo(e.x - 4, e.y + 6)
      ctx.lineTo(e.x - 12, e.y); ctx.lineTo(e.x - 6, e.y - 4)
      ctx.closePath(); ctx.fill()
    }
  } else if (e.type === 'SANCTIONED') {
    ctx.arc(e.x, e.y, 9, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#0a0f24'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(e.x - 3, e.y); ctx.lineTo(e.x - 1, e.y + 3); ctx.lineTo(e.x + 4, e.y - 3)
    ctx.stroke()
  } else if (e.type === 'SCATTERED') {
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2
      const r = (i % 2 === 0) ? 11 : 5
      const px = e.x + Math.cos(ang) * r
      const py = e.y + Math.sin(ang) * r
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, color: string, glow: string) {
  ctx.save()
  ctx.shadowColor = glow; ctx.shadowBlur = 8
  ctx.fillStyle = color
  ctx.fillRect(b.x - 1.5, b.y, 3, b.h || 8)
  ctx.restore()
}

function drawPowerup(ctx: CanvasRenderingContext2D, p: Powerup) {
  const def = POWERUP[p.key]
  const glyphs: Record<string, string> = { SHIELD: 'M', GRAPH: 'G', PAM: 'P', OBSERV: 'O', SWEEP: 'S', SECRET: 'R' }
  ctx.save()
  ctx.translate(p.x, p.y); ctx.rotate(p.age * 0.03)
  ctx.shadowColor = def.color; ctx.shadowBlur = 14
  ctx.fillStyle = def.color; ctx.fillRect(-9, -9, 18, 18)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#0a0f24'; ctx.fillRect(-7, -7, 14, 14)
  ctx.fillStyle = def.color
  ctx.font = 'bold 9px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.rotate(-p.age * 0.03)
  ctx.fillText(glyphs[p.key] || '?', 0, 1)
  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: GameObj) {
  const p = game.player
  if (!p) return
  ctx.save()
  if (p.hitFlash > 0 && p.hitFlash % 6 < 3) ctx.globalAlpha = 0.4
  if (isPUActive(game, 'SHIELD')) {
    ctx.strokeStyle = 'rgba(79,195,247,0.6)'; ctx.lineWidth = 2
    ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
  }
  ctx.shadowColor = isPUActive(game, 'PAM') ? '#FFD54F' : '#B3E5FC'
  ctx.shadowBlur = isPUActive(game, 'PAM') ? 16 : 10
  ctx.fillStyle = '#E6ECFF'
  ctx.beginPath()
  ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x + 14, p.y + 8)
  ctx.lineTo(p.x + 5, p.y + 4); ctx.lineTo(p.x, p.y + 10)
  ctx.lineTo(p.x - 5, p.y + 4); ctx.lineTo(p.x - 14, p.y + 8)
  ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = isPUActive(game, 'PAM') ? '#FFD54F' : '#FF6B4A'
  ctx.beginPath(); ctx.arc(p.x, p.y + 8, 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  })
  ctx.globalAlpha = 1
}

function drawWarmup(ctx: CanvasRenderingContext2D, game: GameObj) {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = "18px 'Press Start 2P', monospace"
  ctx.fillStyle = '#FFC857'; ctx.shadowColor = '#FFC857'; ctx.shadowBlur = 14
  ctx.fillText('INITIATE OBSERVABILITY', CANVAS_W / 2, 130)
  ctx.shadowBlur = 0
  ctx.font = "9px 'Press Start 2P', monospace"
  ctx.fillStyle = '#8A9AC8'
  ctx.fillText('SHOOT EACH SYSTEM TO ENABLE FULL VISIBILITY', CANVAS_W / 2, 165)
  const activated = game.warmupTargets.filter(t => t.activated).length
  const total = game.warmupTargets.length
  const allOn = activated === total
  ctx.font = "11px 'Press Start 2P', monospace"
  ctx.fillStyle = allOn ? '#FFC857' : '#E6ECFF'
  if (allOn) { ctx.shadowColor = '#FFC857'; ctx.shadowBlur = 10 }
  ctx.fillText(`${activated} / ${total} SYSTEMS ONLINE`, CANVAS_W / 2, 200)
  ctx.shadowBlur = 0
  game.warmupTargets.forEach(t => drawWarmupTarget(ctx, t))
  ctx.restore()
}

function drawWarmupTarget(ctx: CanvasRenderingContext2D, t: WarmupTarget) {
  const tx = t.x
  const ty = t.y + Math.sin(t.bobPhase) * 5
  ctx.save()
  if (t.activated) {
    ctx.shadowColor = t.glow; ctx.shadowBlur = 20
    ctx.fillStyle = t.color; ctx.strokeStyle = t.color; ctx.lineWidth = 2.5
    drawSystemIcon(ctx, t.id, tx, ty, false)
    ctx.shadowBlur = 0
    ctx.font = "8px 'Press Start 2P', monospace"
    ctx.fillStyle = t.color; ctx.textAlign = 'center'
    ctx.fillText(t.label, tx, ty + 50)
    ctx.font = "7px 'Press Start 2P', monospace"
    ctx.fillStyle = '#81C784'
    ctx.fillText('● ONLINE', tx, ty + 64)
  } else {
    const pulse = 0.45 + Math.sin(performance.now() / 380) * 0.18
    ctx.globalAlpha = pulse
    ctx.strokeStyle = t.color; ctx.lineWidth = 2
    drawSystemIcon(ctx, t.id, tx, ty, true)
    ctx.globalAlpha = 1
    ctx.font = "8px 'Press Start 2P', monospace"
    ctx.fillStyle = '#8A9AC8'; ctx.textAlign = 'center'
    ctx.fillText(t.label, tx, ty + 50)
    ctx.font = "7px 'Press Start 2P', monospace"
    ctx.fillStyle = '#FF6B4A'
    ctx.fillText('○ OFFLINE', tx, ty + 64)
  }
  ctx.restore()
}

function drawSystemIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, outline: boolean) {
  if (id === 'onprem') {
    ctx.beginPath(); ctx.rect(x - 16, y - 19, 32, 38)
    if (outline) { ctx.stroke() } else {
      ctx.fill(); ctx.fillStyle = '#0a0f24'
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 10, y - 13 + i * 9, 20, 3)
    }
  } else if (id === 'cloud') {
    ctx.beginPath()
    ctx.arc(x - 11, y + 3, 10, 0, Math.PI * 2)
    ctx.arc(x + 6, y - 4, 12, 0, Math.PI * 2)
    ctx.arc(x + 14, y + 6, 9, 0, Math.PI * 2)
    ctx.arc(x - 2, y + 9, 11, 0, Math.PI * 2)
    if (outline) ctx.stroke(); else ctx.fill()
  } else if (id === 'human') {
    ctx.beginPath(); ctx.arc(x, y - 8, 8, 0, Math.PI * 2)
    if (outline) ctx.stroke(); else ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y + 22, 16, Math.PI, 0, false); ctx.lineTo(x + 16, y + 22)
    if (outline) ctx.stroke(); else ctx.fill()
  } else if (id === 'nhi') {
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 - Math.PI / 16
      const r = (i % 2 === 0) ? 18 : 13
      const px = x + Math.cos(ang) * r; const py = y + Math.sin(ang) * r
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.closePath()
    if (outline) ctx.stroke(); else ctx.fill()
    if (!outline) { ctx.fillStyle = '#0a0f24'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill() }
  } else if (id === 'ai') {
    const w = 30, h = 30, r = 6
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + r, y - h / 2); ctx.lineTo(x + w / 2 - r, y - h / 2)
    ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r)
    ctx.lineTo(x + w / 2, y + h / 2 - r)
    ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2)
    ctx.lineTo(x - w / 2 + r, y + h / 2)
    ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r)
    ctx.lineTo(x - w / 2, y - h / 2 + r)
    ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2)
    ctx.closePath()
    if (outline) ctx.stroke(); else ctx.fill()
    ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y - h / 2 - 6); ctx.lineWidth = 2; ctx.stroke()
    if (!outline) {
      ctx.fillStyle = '#0a0f24'
      ctx.beginPath(); ctx.arc(x - 6, y - 3, 3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 6, y - 3, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillRect(x - 7, y + 6, 14, 2)
    }
  }
}
