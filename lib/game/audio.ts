let audioCtx: AudioContext | null = null

export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {}
  }
}

function beep(freq = 440, dur = 0.07, type: OscillatorType = 'square', vol = 0.04) {
  if (!audioCtx) return
  const o = audioCtx.createOscillator()
  const g = audioCtx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = vol
  o.connect(g)
  g.connect(audioCtx.destination)
  o.start()
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur)
  o.stop(audioCtx.currentTime + dur)
}

export const sfxShoot       = () => beep(880, 0.05, 'square', 0.025)
export const sfxHit         = () => beep(220, 0.08, 'sawtooth', 0.04)
export const sfxPlayerHit   = () => beep(110, 0.25, 'sawtooth', 0.07)
export const sfxAlert       = () => { beep(440, 0.1, 'square', 0.05); setTimeout(() => beep(330, 0.1, 'square', 0.05), 120) }
export const sfxPowerUp     = () => {
  beep(660, 0.06, 'sine', 0.05)
  setTimeout(() => beep(990, 0.06, 'sine', 0.05), 60)
  setTimeout(() => beep(1320, 0.08, 'sine', 0.05), 120)
}
export const sfxFlagshipBig = () => {
  beep(660, 0.1, 'triangle', 0.06)
  setTimeout(() => beep(990, 0.1, 'triangle', 0.06), 100)
  setTimeout(() => beep(1320, 0.16, 'triangle', 0.07), 200)
}
