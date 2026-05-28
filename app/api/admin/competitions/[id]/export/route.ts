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

interface Props { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()

  const { data: entries } = await service
    .from('competition_entries')
    .select('first_name, last_name, email, linkedin_url, disqualified, entered_at, player_id')
    .eq('competition_id', id)
    .order('entered_at', { ascending: true })

  const { data: lb } = await service
    .from('competition_leaderboard')
    .select('player_id, handle, best_score, current_rank, scores_count')
    .eq('competition_id', id)

  const rankMap = Object.fromEntries((lb ?? []).map(r => [r.player_id, r]))

  const { data: comp } = await service
    .from('competitions')
    .select('name')
    .eq('id', id)
    .single()

  const headers = ['rank', 'handle', 'first_name', 'last_name', 'email', 'linkedin_url', 'best_score', 'plays', 'disqualified', 'entered_at']

  const rows = (entries ?? []).map(e => {
    const r = rankMap[e.player_id]
    return [
      r?.current_rank ?? '',
      r?.handle ?? '',
      e.first_name,
      e.last_name,
      e.email,
      e.linkedin_url ?? '',
      r?.best_score ?? '',
      r?.scores_count ?? '',
      e.disqualified ? 'yes' : 'no',
      e.entered_at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `${comp?.name?.replace(/\s+/g, '-').toLowerCase() ?? 'competition'}-export.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
