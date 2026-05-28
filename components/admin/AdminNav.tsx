'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props { email: string; name: string; role: string }

export default function AdminNav({ email, name, role }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const sb = createClient()

  async function signOut() {
    await sb.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const links = [
    { href: '/admin', label: 'DASHBOARD' },
    { href: '/admin/competitions', label: 'COMPETITIONS' },
    { href: '/admin/players', label: 'PLAYERS' },
  ]

  return (
    <nav className="border-b border-white/10 bg-[#0d1230]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="text-xs font-press text-[#FFC857] tracking-widest hidden sm:block">ID DEFENDER ADMIN</span>
          <div className="flex gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[10px] font-press tracking-wider px-3 py-1.5 rounded transition-colors ${
                  pathname === l.href
                    ? 'bg-[#FFC857]/10 text-[#FFC857]'
                    : 'text-[#8A9AC8] hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8A9AC8] font-mono hidden md:block">{name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFC857]/10 text-[#FFC857] font-press tracking-wider">{role.toUpperCase()}</span>
          <button
            onClick={signOut}
            className="text-[10px] font-press tracking-wider text-[#8A9AC8] hover:text-white transition-colors"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </nav>
  )
}
