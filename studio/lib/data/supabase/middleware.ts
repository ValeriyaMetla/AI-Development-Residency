import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  IS_PRODUCTION,
  SESSION_LAST_ACTIVE_COOKIE,
  SESSION_STARTED_COOKIE,
  authCookieOptions,
  sessionMarkerOptions,
} from '@/lib/data/supabase/cookie-options';
import { parseMarker, sessionTimeoutState } from '@/lib/domain/session-timeout';

/** Refresh "last used" at most this often, so not every request rewrites the cookie. */
const LAST_ACTIVE_REFRESH_MS = 60 * 1000;

/**
 * Refreshes the Supabase session on every request, guards routes, and enforces the session limits.
 * (Called from the root middleware.ts.)
 *
 * Standard @supabase/ssr pattern: do NOT run other logic between creating the client and calling
 * getUser(), or sessions can fail to refresh.
 *
 * Session limits (ADR-0033 point 1 · PenTest F-05 · SR-08, SR-09): with a signed-in user, two HttpOnly
 * markers record when the session started and when it was last used. Over 1 hour idle or 24 hours since
 * sign-in, the user is signed out on this device and sent to the login page. Missing markers (a session
 * from before this change, or a fresh sign-in) start the clock instead of signing out.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // HttpOnly + Secure (on the live site) + SameSite=Lax for the auth cookies (ADR-0033 point 2).
      cookieOptions: authCookieOptions(IS_PRODUCTION),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth');
  const isProtected = path.startsWith('/dashboard');

  // Redirect, carrying over any refreshed (or cleared) session cookies so they aren't lost.
  const redirectTo = (pathname: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (user) {
    const now = Date.now();
    const lastActiveAt = parseMarker(request.cookies.get(SESSION_LAST_ACTIVE_COOKIE)?.value);
    const state = sessionTimeoutState({
      now,
      startedAt: parseMarker(request.cookies.get(SESSION_STARTED_COOKIE)?.value),
      lastActiveAt,
    });

    if (state === 'idle' || state === 'too_old') {
      // This device only: other devices keep their own sessions and limits.
      await supabase.auth.signOut({ scope: 'local' });
      const response = redirectTo('/login', '?reason=signed-out');
      response.cookies.delete(SESSION_STARTED_COOKIE);
      response.cookies.delete(SESSION_LAST_ACTIVE_COOKIE);
      return response;
    }

    const markerOptions = sessionMarkerOptions(IS_PRODUCTION);
    if (state === 'start') {
      supabaseResponse.cookies.set(SESSION_STARTED_COOKIE, String(now), markerOptions);
    }
    if (
      state === 'start' ||
      lastActiveAt === null ||
      now - lastActiveAt >= LAST_ACTIVE_REFRESH_MS
    ) {
      supabaseResponse.cookies.set(SESSION_LAST_ACTIVE_COOKIE, String(now), markerOptions);
    }
  }

  // Unauthenticated users can't reach protected routes.
  if (!user && isProtected) {
    return redirectTo('/login');
  }

  // Authenticated users skip the auth pages.
  if (user && isAuthRoute) {
    return redirectTo('/dashboard');
  }

  return supabaseResponse;
}
