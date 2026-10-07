import { type NextRequest } from 'next/server'
import { UUID, readJson, logEvent } from '@/lib/server/game'

// Events the browser may report. Server-side events (game_start, score_saved, ...) are logged by their routes.
const CLIENT_EVENTS = new Set(['page_view', 'quarter_end', 'game_over', 'share'])

export async function POST(req: NextRequest) {
  const body = await readJson(req)
  const name = String(body?.name ?? '')
  if (!CLIENT_EVENTS.has(name)) return new Response(null, { status: 400 })
  const token = String(body?.token ?? '')
  const sessionId = String(body?.sessionId ?? '')
  const props = body?.props && typeof body.props === 'object' ? { ...body.props as Record<string, unknown> } : {}
  if (JSON.stringify(props).length > 1000) return new Response(null, { status: 413 })
  delete props.geo; delete props.arcade  // location and arcade id come from the server only
  await logEvent(name, UUID.test(token) ? token : null, UUID.test(sessionId) ? sessionId : null, props, req)
  return new Response(null, { status: 204 })
}
