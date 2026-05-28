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

export async function POST(request: NextRequest, { params }: Props) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Support both JSON body and form data
  let entryId: string | null = null
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json()
    entryId = body.entry_id
  } else {
    const fd = await request.formData()
    entryId = fd.get('entry_id') as string
  }

  if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service
    .from('competition_entries')
    .update({ disqualified: true })
    .eq('id', entryId)
    .eq('competition_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Redirect back to competition page for form submissions
  return NextResponse.redirect(new URL(`/admin/competitions/${id}`, request.url))
}
