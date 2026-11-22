import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/data/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on all paths except static assets, image files, and the no-login demo. The demo is
  // excluded so it runs no auth code and creates no session (ADR-0029 point 1); `demo(?:/|$)`
  // matches /demo and /demo/… only, never a path like /demonstration.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|demo(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
