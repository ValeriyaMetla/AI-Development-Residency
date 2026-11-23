import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The session middleware enforces the limits (ADR-0033 point 1 · PenTest F-05 · SR-08, SR-09): with a
 * signed-in user it starts the clock if the markers are missing, refreshes "last used", and signs the
 * user out (locally) with a redirect to the login page once they've been idle over 1 hour or signed in
 * over 24 hours. The Supabase client is faked; the real updateSession and timeout rule run.
 */

const getUser = vi.fn();
const signOut = vi.fn();
let capturedOptions: Record<string, unknown> | undefined;

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: Record<string, unknown>) => {
    capturedOptions = options;
    return { auth: { getUser, signOut } };
  },
}));

import { updateSession } from '@/lib/data/supabase/middleware';
import {
  SESSION_LAST_ACTIVE_COOKIE,
  SESSION_STARTED_COOKIE,
} from '@/lib/data/supabase/cookie-options';

const HOUR = 60 * 60 * 1000;

function request(path: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(path, 'http://localhost:3000'));
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user1' } } });
  signOut.mockResolvedValue({ error: null });
});

describe('updateSession — session limits', () => {
  it('passes the HttpOnly cookie options to Supabase', async () => {
    await updateSession(request('/dashboard'));
    expect(capturedOptions?.cookieOptions).toMatchObject({ httpOnly: true, sameSite: 'lax' });
  });

  it('starts the clock when the markers are missing (no sign-out for older sessions)', async () => {
    const res = await updateSession(request('/dashboard'));
    expect(signOut).not.toHaveBeenCalled();
    expect(res.cookies.get(SESSION_STARTED_COOKIE)?.value).toMatch(/^\d+$/);
    expect(res.cookies.get(SESSION_LAST_ACTIVE_COOKIE)?.value).toMatch(/^\d+$/);
    expect(res.cookies.get(SESSION_STARTED_COOKIE)?.httpOnly).toBe(true);
  });

  it('keeps an active session going', async () => {
    const now = Date.now();
    const res = await updateSession(
      request('/dashboard', {
        [SESSION_STARTED_COOKIE]: String(now - 2 * HOUR),
        [SESSION_LAST_ACTIVE_COOKIE]: String(now - 10 * 60_000),
      }),
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBeNull();
    expect(Number(res.cookies.get(SESSION_LAST_ACTIVE_COOKIE)?.value)).toBeGreaterThanOrEqual(now);
  });

  it('signs out (this device only) and sends to login after more than 1 hour idle', async () => {
    const now = Date.now();
    const res = await updateSession(
      request('/dashboard', {
        [SESSION_STARTED_COOKIE]: String(now - 3 * HOUR),
        [SESSION_LAST_ACTIVE_COOKIE]: String(now - 2 * HOUR),
      }),
    );
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('reason')).toBe('signed-out');
  });

  it('signs out after more than 24 hours since sign-in, even if just used', async () => {
    const now = Date.now();
    const res = await updateSession(
      request('/skills', {
        [SESSION_STARTED_COOKIE]: String(now - 25 * HOUR),
        [SESSION_LAST_ACTIVE_COOKIE]: String(now - 60_000),
      }),
    );
    expect(signOut).toHaveBeenCalled();
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('does nothing about markers when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(request('/'));
    expect(signOut).not.toHaveBeenCalled();
    expect(res.cookies.get(SESSION_STARTED_COOKIE)).toBeUndefined();
  });
});
