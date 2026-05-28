import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) redirect('/admin/login')

  // Verify user is in admin_users table
  const service = createServiceClient()
  const { data: adminUser } = await service
    .from('admin_users')
    .select('id, name, role')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) redirect('/admin/login?error=unauthorized')

  return (
    <div className="min-h-screen bg-[#07091a] text-white">
      <AdminNav email={user.email ?? ''} name={adminUser.name ?? user.email ?? ''} role={adminUser.role} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
