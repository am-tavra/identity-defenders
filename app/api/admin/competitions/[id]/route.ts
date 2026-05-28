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

// PATCH — update competition (toggle active, edit fields)
export async function PATCH(request: NextRequest, { params }: Props) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const service = createServiceClient()

  // If activating, deactivate all others first
  if (body.active === true) {
    await service.from('competitions').update({ active: false }).neq('id', id)
  }

  const { data, error } = await service
    .from('competitions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST to /[id]/disqualify via form action
export async function POST(request: NextRequest, { params }: Props) {
  return NextResponse.json({ error: 'Use /disqualify endpoint' }, { status: 404 })
}
