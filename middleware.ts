import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth-protection middleware for admin and host routes.
 * Checks for Supabase auth token in cookies/headers.
 * If not authenticated, redirects to /auth with return URL.
 *
 * Note: This is a lightweight check. Full authorization (admin role, host approval)
 * is enforced by Supabase RLS policies at the database level.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Supabase auth session
  const hasAuthToken =
    request.cookies.has('sb-access-token') ||
    request.cookies.has('sb-refresh-token') ||
    // Supabase JS client stores tokens with project ref prefix
    Array.from(request.cookies.getAll()).some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

  if (!hasAuthToken) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/host-dashboard/:path*', '/host-application/:path*'],
};
