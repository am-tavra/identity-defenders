import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

export async function GET(_request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: players } = await service
    .from('players')
    .select('handle, name, email, best_score, streak_days, total_plays, last_played_date, created_at')
    .order('best_score', { ascending: false })

  const headers = ['handle', 'name', 'email', 'best_score', 'streak_days', 'total_plays', 'last_played_date', 'created_at']
  const rows = (players ?? []).map(p =>
    [p.handle, p.name, p.email, p.best_score, p.streak_days, p.total_plays, p.last_played_date, p.created_at]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="players-export.csv"',
    },
  })
}
