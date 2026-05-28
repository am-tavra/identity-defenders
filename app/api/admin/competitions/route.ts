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

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, prize_description, banner_text, starts_at, ends_at } = body

  if (!name || !starts_at || !ends_at) {
    return NextResponse.json({ error: 'name, starts_at, ends_at are required' }, { status: 400 })
  }
  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: adminUser } = await service
    .from('admin_users').select('id').eq('user_id', user.id).single()

  const { data, error } = await service
    .from('competitions')
    .insert({ name, prize_description, banner_text, starts_at, ends_at, active: false, created_by: adminUser?.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
