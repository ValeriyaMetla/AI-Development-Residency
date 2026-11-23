import { SESSION_MAX_MS } from '@/lib/domain/session-timeout';

/**
 * Cookie flags (Data-Source layer, ADR-0033 point 2 · PenTest F-05 · SR-08). One place for the flags
 * on every session cookie the app sets.
 *
 * - The Supabase auth cookies: HttpOnly (no page script can read them — the browser-side Supabase
 *   client is unused, so nothing needs to), Secure on the live HTTPS site, SameSite=Lax. @supabase/ssr
 *   merges these over its defaults (which are HttpOnly off, 400 days).
 * - The two session-timeout markers (ADR-0033 point 1): the same flags, and they last no longer than
 *   the 24-hour session itself.
 *
 * `isProduction` decides Secure: true on the live site; false for `next dev` on http://localhost.
 */

export const SESSION_STARTED_COOKIE = 'studio_session_started';
export const SESSION_LAST_ACTIVE_COOKIE = 'studio_last_active';

export function authCookieOptions(isProduction: boolean) {
  return { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/' };
}

export function sessionMarkerOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_MS / 1000,
  };
}

/** True for a production build (the live site, or a local `next start`). */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
