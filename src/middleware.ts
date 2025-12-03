import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(req: NextRequest) {
  // First, handle i18n
  const intlResponse = intlMiddleware(req);
  
  // If i18n middleware returns a redirect, return it immediately
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Continue with Supabase auth middleware
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user is authenticated for protected routes
  // Extract locale from pathname (e.g., /ca/dashboard -> /dashboard)
  const pathnameWithoutLocale = req.nextUrl.pathname.replace(/^\/(ca|es)/, '');
  
  const protectedPaths = [
    '/dashboard',
    '/api/upload',
    '/api/audio',
    '/api/export',
  ]

  const isProtectedPath = protectedPaths.some(path => 
    pathnameWithoutLocale.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect to sign in page (preserve locale)
    const locale = req.nextUrl.pathname.match(/^\/(ca|es)/)?.[1] || 'ca';
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = `/${locale}/auth/signin`
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};