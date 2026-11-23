import { describe, it, expect } from 'vitest';
import {
  SESSION_LAST_ACTIVE_COOKIE,
  SESSION_STARTED_COOKIE,
  authCookieOptions,
  sessionMarkerOptions,
} from '@/lib/data/supabase/cookie-options';
import { SESSION_MAX_MS } from '@/lib/domain/session-timeout';

/**
 * Cookie flags (ADR-0033 point 2 · PenTest F-05 · SR-08). The Supabase auth cookies were set without
 * HttpOnly or Secure, for 400 days (db/P1-cookies.txt). Nothing in the app reads them from a page
 * script (the browser-side Supabase client is unused), so they can be HttpOnly. Secure is set on the
 * live HTTPS site only, so the laptop's http://localhost keeps working.
 */

describe('authCookieOptions — the Supabase session cookies', () => {
  it('are HttpOnly, Secure and SameSite=Lax in production', () => {
    expect(authCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('are HttpOnly but not Secure for local http://localhost development', () => {
    expect(authCookieOptions(false)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  });
});

describe('sessionMarkerOptions — the two timeout markers', () => {
  it('are HttpOnly, Secure in production, SameSite=Lax, and expire with the session', () => {
    expect(sessionMarkerOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_MS / 1000,
    });
  });

  it('have distinct, app-specific names', () => {
    expect(SESSION_STARTED_COOKIE).not.toBe(SESSION_LAST_ACTIVE_COOKIE);
    expect(SESSION_STARTED_COOKIE.startsWith('studio_')).toBe(true);
    expect(SESSION_LAST_ACTIVE_COOKIE.startsWith('studio_')).toBe(true);
  });
});
