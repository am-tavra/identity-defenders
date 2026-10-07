import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ARCADE_COOKIE = 'arcade_id'
const ARCADE_DOMAIN = 'threatarcade.com'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Every visitor gets an anonymous arcade id. On *.threatarcade.com it is set for the parent
// domain, so all the games share it and the arcade admin can see play across games.
function ensureArcadeCookie(req: NextRequest, res: NextResponse) {
  const existing = req.cookies.get(ARCADE_COOKIE)?.value
  if (existing && UUID.test(existing)) return
  const host = (req.headers.get('host') ?? '').split(':')[0]
  const onArcade = host === ARCADE_DOMAIN || host.endsWith('.' + ARCADE_DOMAIN)
  res.cookies.set(ARCADE_COOKIE, crypto.randomUUID(), {
    path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    ...(onArcade ? { domain: '.' + ARCADE_DOMAIN } : {}),
  })
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = (request.headers.get('host') ?? '').split(':')[0]

  // Once the game lives on its threatarcade.com subdomain, send the old public vercel.app
  // address there. Preview deployments (…-tavra.vercel.app) are left alone.
  const canonical = process.env.CANONICAL_HOST
  if (canonical && host !== canonical && /^[a-z0-9-]+\.vercel\.app$/.test(host) && !host.endsWith('-tavra.vercel.app')) {
    return NextResponse.redirect(`https://${canonical}${pathname}${search}`, 308)
  }

  // The login page and the password-reset page (reached from an email link) need no session
  if (!pathname.startsWith('/admin') || pathname === '/admin/login' || pathname === '/admin/reset-password') {
    const res = NextResponse.next()
    ensureArcadeCookie(request, res)
    return res
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Verify user is in admin_users table — checked in layout, not here,
  // to avoid a DB call on every request. Middleware only checks auth.
  return response
}

export const config = {
  // everything except static assets, so the arcade cookie exists before the first event
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
