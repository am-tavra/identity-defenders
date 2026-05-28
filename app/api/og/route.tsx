import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Node.js runtime so we can load the font from node_modules
export const runtime = 'nodejs'

const fontData = readFileSync(
  join(process.cwd(), 'node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff')
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const name     = searchParams.get('name')  || 'DEFENDER'
  const score    = parseInt(searchParams.get('score')  || '0', 10)
  const wave     = parseInt(searchParams.get('wave')   || '1', 10)
  const rank     = searchParams.get('rank')
  const deltaRaw = searchParams.get('delta')
  const comp     = searchParams.get('comp')
  const shareUrl = searchParams.get('url')   || ''

  const delta = deltaRaw !== null ? parseInt(deltaRaw, 10) : null
  const deltaLabel = delta !== null && delta !== 0
    ? delta > 0 ? ` ▲${delta}` : ` ▼${Math.abs(delta)}`
    : ''

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(135deg, #FFC857, #FF6B4A, #E94A88, #B255D6)',
        padding: 6, borderRadius: 16, display: 'flex',
      }}>
        <div style={{
          flex: 1,
          background: 'linear-gradient(180deg, #1a2253 0%, #07091a 100%)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          fontFamily: '"PressStart2P"',
        }}>
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(120,140,220,0.06) 49px, rgba(120,140,220,0.06) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(120,140,220,0.06) 49px, rgba(120,140,220,0.06) 50px)',
            display: 'flex',
          }} />

          <div style={{ fontSize: 24, color: '#FFC857', letterSpacing: 2, marginBottom: 16, zIndex: 1, display: 'flex' }}>
            IDENTITY DEFENDER
          </div>

          {comp && rank && (
            <div style={{
              fontSize: 12, color: '#FF6B4A',
              background: 'rgba(255,107,74,0.15)',
              border: '1px solid rgba(255,107,74,0.5)',
              padding: '6px 18px', borderRadius: 20, marginBottom: 16, zIndex: 1, display: 'flex',
            }}>
              {`${comp.toUpperCase()} · RANK #${rank}${deltaLabel}`}
            </div>
          )}

          <div style={{ fontSize: 14, color: '#8A9AC8', marginBottom: 10, zIndex: 1, display: 'flex' }}>
            IDENTITIES PROTECTED
          </div>

          <div style={{
            fontSize: 144, fontWeight: 700, color: '#FFC857',
            lineHeight: 1, marginBottom: 20, zIndex: 1, display: 'flex',
            fontFamily: 'monospace',
          }}>
            {score.toLocaleString()}
          </div>

          <div style={{ fontSize: 14, color: '#FF6B4A', marginBottom: 12, zIndex: 1, display: 'flex' }}>
            {`REACHED QUARTER ${wave}${name !== 'DEFENDER' ? `  ·  ${name}` : ''}`}
          </div>

          <div style={{ fontSize: 17, color: '#E6ECFF', marginBottom: 24, zIndex: 1, display: 'flex', fontFamily: 'monospace', fontStyle: 'italic' }}>
            "Hackers don't hack in — they log in."
          </div>

          {shareUrl && (
            <div style={{ fontSize: 15, color: '#FFC857', fontFamily: 'monospace', fontWeight: 700, zIndex: 1, display: 'flex' }}>
              {`▶  ${shareUrl}`}
            </div>
          )}

          <svg style={{ position: 'absolute', left: 64, bottom: 48, zIndex: 1 }} width={56} height={56} viewBox="-18 -18 36 36">
            <polygon points="0,-14 14,8 5,4 0,10 -5,4 -14,8" fill="#E6ECFF" />
            <circle cx="0" cy="8" r="3" fill="#FF6B4A" />
          </svg>

          <svg style={{ position: 'absolute', right: 64, bottom: 44, zIndex: 1 }} width={68} height={68} viewBox="-18 -18 36 36">
            <polygon points="0,-14 14,0 0,14 -14,0" fill="#FFD54F" />
            <circle cx="0" cy="0" r="5" fill="#0a0f24" />
            <circle cx="0" cy="0" r="2.5" fill="#FFD54F" />
          </svg>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'PressStart2P', data: fontData, weight: 400 }],
    }
  )
}
