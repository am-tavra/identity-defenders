import type { CachedPlayer, CachedScore } from './types'

async function ensureFontsLoaded() {
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch {}
  }
}

export async function generateShareCard(
  score: number,
  wave: number,
  shareUrl: string,
  cachedPlayer: CachedPlayer | null,
  cachedScores: CachedScore[],
): Promise<HTMLCanvasElement> {
  await ensureFontsLoaded()
  const W = 1200, H = 630
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const cx = c.getContext('2d')!

  const bg = cx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1a2253'); bg.addColorStop(1, '#07091a')
  cx.fillStyle = bg; cx.fillRect(0, 0, W, H)

  cx.strokeStyle = 'rgba(120,140,220,0.07)'; cx.lineWidth = 1
  for (let x = 0; x < W; x += 50) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke() }
  for (let y = 0; y < H; y += 50) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke() }

  const accents: [number, number, string, number][] = [
    [120, 140, '#4FC3F7', 2], [260, 90, '#BA68C8', 1.5], [980, 110, '#FFD54F', 2],
    [1100, 200, '#FF6B4A', 1.5], [180, 480, '#E94A88', 2], [1050, 500, '#4FC3F7', 1.5],
    [820, 80, '#BA68C8', 1], [400, 540, '#FFD54F', 1.5], [50, 320, '#E94A88', 1],
  ]
  accents.forEach(([x, y, color, r]) => {
    cx.fillStyle = color; cx.globalAlpha = 0.35
    cx.beginPath(); cx.arc(x, y, r * 2, 0, Math.PI * 2); cx.fill()
  })
  cx.globalAlpha = 1

  const border = cx.createLinearGradient(0, 0, W, H)
  border.addColorStop(0, '#FFC857'); border.addColorStop(0.33, '#FF6B4A')
  border.addColorStop(0.66, '#E94A88'); border.addColorStop(1, '#B255D6')
  cx.strokeStyle = border; cx.lineWidth = 6
  cx.strokeRect(10, 10, W - 20, H - 20)

  cx.font = "24px 'Press Start 2P', monospace"
  cx.fillStyle = '#FFC857'; cx.textAlign = 'center'; cx.textBaseline = 'middle'
  cx.fillText('IDENTITY DEFENDER', W / 2, 70)

  cx.font = "18px 'Press Start 2P', monospace"
  cx.fillStyle = '#8A9AC8'; cx.fillText('IDENTITIES PROTECTED', W / 2, 200)

  cx.font = "bold 150px 'JetBrains Mono', monospace"
  cx.fillStyle = '#FFC857'; cx.shadowColor = '#FFC857'; cx.shadowBlur = 40
  cx.fillText(score.toLocaleString(), W / 2, 340)
  cx.shadowBlur = 0

  cx.font = "16px 'Press Start 2P', monospace"
  cx.fillStyle = '#FF6B4A'
  let subtitle = `REACHED QUARTER ${wave}`
  if (cachedPlayer?.name) subtitle += `  ·  DEFENDED BY ${cachedPlayer.name}`
  cx.fillText(subtitle, W / 2, 420)

  cx.font = "italic 22px 'JetBrains Mono', monospace"
  cx.fillStyle = '#E6ECFF'
  cx.fillText('“Hackers don’t hack in — they log in.”', W / 2, 490)

  if (shareUrl) {
    cx.font = "bold 18px 'JetBrains Mono', monospace"
    cx.fillStyle = '#FFC857'; cx.shadowColor = '#FFC857'; cx.shadowBlur = 14
    cx.fillText(`▶ PLAY  ·  ${shareUrl}`, W / 2, 560)
    cx.shadowBlur = 0
  }

  if (cachedPlayer && cachedScores.length) {
    const globalRank = cachedScores.findIndex(s => s.name === cachedPlayer.name) + 1 || 99
    const badge = getBadgeLabel(cachedPlayer, globalRank)
    if (badge) {
      cx.font = "bold 14px 'Press Start 2P', monospace"
      const bw = cx.measureText(badge).width + 28
      const bx = W - bw - 28, by = H - 44
      cx.fillStyle = 'rgba(10,15,36,0.75)'
      cx.beginPath(); cx.roundRect(bx, by, bw, 28, 14); cx.fill()
      cx.strokeStyle = 'rgba(255,200,87,0.5)'; cx.lineWidth = 1; cx.stroke()
      cx.fillStyle = '#FFC857'; cx.shadowColor = '#FFC857'; cx.shadowBlur = 8
      cx.fillText(badge, bx + bw / 2, by + 19); cx.shadowBlur = 0
    }
  }

  drawCardSentinel(cx, 90, 560, 2)
  drawCardAgent(cx, W - 90, 560, 2.4)
  return c
}

function getBadgeLabel(player: CachedPlayer, globalRank: number): string | null {
  if (globalRank === 1) return '👑 #1 DEFENDER'
  if (globalRank <= 3) return '⭐ TOP 3'
  if ((player.streak_days || 0) >= 30) return '🔥🔥🔥 30-DAY STREAK'
  if ((player.streak_days || 0) >= 7) return '🔥🔥 7-DAY STREAK'
  if ((player.streak_days || 0) >= 3) return '🔥 3-DAY STREAK'
  if ((player.total_plays || 0) >= 10) return '🛡 VETERAN'
  return null
}

function drawCardSentinel(cx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  cx.save(); cx.translate(x, y); cx.scale(scale, scale)
  cx.shadowColor = '#B3E5FC'; cx.shadowBlur = 14; cx.fillStyle = '#E6ECFF'
  cx.beginPath()
  cx.moveTo(0, -14); cx.lineTo(14, 8); cx.lineTo(5, 4)
  cx.lineTo(0, 10); cx.lineTo(-5, 4); cx.lineTo(-14, 8)
  cx.closePath(); cx.fill()
  cx.shadowBlur = 0; cx.fillStyle = '#FF6B4A'
  cx.beginPath(); cx.arc(0, 8, 3, 0, Math.PI * 2); cx.fill()
  cx.restore()
}

function drawCardAgent(cx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  cx.save(); cx.translate(x, y); cx.scale(scale, scale)
  cx.shadowColor = '#FFE082'; cx.shadowBlur = 16; cx.fillStyle = '#FFD54F'
  cx.beginPath()
  cx.moveTo(0, -12); cx.lineTo(12, 0); cx.lineTo(0, 12); cx.lineTo(-12, 0)
  cx.closePath(); cx.fill()
  cx.shadowBlur = 0; cx.fillStyle = '#0a0f24'
  cx.beginPath(); cx.arc(0, 0, 4, 0, Math.PI * 2); cx.fill()
  cx.fillStyle = '#FFD54F'
  cx.beginPath(); cx.arc(0, 0, 2, 0, Math.PI * 2); cx.fill()
  cx.restore()
}

export async function downloadShareCard(card: HTMLCanvasElement, score: number) {
  const filename = `identity_defender_${score}.png`
  if (card.toBlob) {
    card.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  } else {
    const a = document.createElement('a')
    a.href = card.toDataURL('image/png'); a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
}

export async function copyCardToClipboard(card: HTMLCanvasElement): Promise<{ ok: boolean; reason?: string }> {
  if (!navigator.clipboard || !window.ClipboardItem) return { ok: false, reason: 'unsupported' }
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      if (card.toBlob) { card.toBlob(b => b ? resolve(b) : reject(new Error('null blob')), 'image/png') }
      else { fetch(card.toDataURL('image/png')).then(r => r.blob()).then(resolve).catch(reject) }
    })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return { ok: true }
  } catch (e: any) {
    console.error('Copy image failed:', e)
    return { ok: false, reason: e?.name === 'NotAllowedError' ? 'blocked' : 'error' }
  }
}
