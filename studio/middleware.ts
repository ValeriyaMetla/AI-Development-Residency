import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/data/supabase/middleware';
import { buildContentSecurityPolicy, makeNonce } from '@/lib/security/headers';

/**
 * Runs on every page request (except static assets and the demo — see the matcher). It:
 * - stamps a fresh content-security-policy nonce (ADR-0033 point 3): set on the request so Next.js
 *   and MUI apply it to their own scripts and styles (`x-nonce`, read in app/layout.tsx), and on the
 *   response so the browser enforces it;
 * - refreshes the Supabase session, guards routes and enforces the session limits (updateSession).
 */
export async function middleware(request: NextRequest) {
  const nonce = makeNonce();
  const csp = buildContentSecurityPolicy({ nonce, dev: process.env.NODE_ENV !== 'production' });
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', csp);

  const response = await updateSession(request);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Run on all paths except static assets, image files, and the no-login demo. The demo is
  // excluded so it runs no auth code and creates no session (ADR-0029 point 1); `demo(?:/|$)`
  // matches /demo and /demo/… only, never a path like /demonstration.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|demo(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
