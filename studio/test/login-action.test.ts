import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The login action throttles failed sign-ins (ADR-0037 · PenTest F-04 · SR-07): login_guard is
 * checked BEFORE the password (a 'locked' result refuses with the generic message, without calling
 * Supabase), the outcome is recorded after, and the guard FAILS OPEN — a null/error result lets the
 * sign-in proceed. The generic message is the same for a lockout and a wrong password.
 */

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/data/supabase/server', () => ({
  createClient: vi.fn(),
  resetSessionMarkers: vi.fn(),
}));
vi.mock('@/lib/data/login-lockout', () => ({ loginGuard: vi.fn(), recordLogin: vi.fn() }));
vi.mock('@/lib/security/security-log', () => ({
  logSecurityEvent: vi.fn(),
  emailRef: vi.fn((e: string) => `e:${e}`),
  userRef: vi.fn(),
}));

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, resetSessionMarkers } from '@/lib/data/supabase/server';
import { loginGuard, recordLogin } from '@/lib/data/login-lockout';
import { LOGIN_GENERIC_ERROR } from '@/lib/domain/login-lockout';
import { logSecurityEvent } from '@/lib/security/security-log';
import { login } from '@/app/auth/actions';

const signInWithPassword = vi.fn();

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { email: 'a@example.com', password: 'Str0ng!pass' };

async function run(fields: Record<string, string>): Promise<string> {
  try {
    await login(form(fields));
  } catch {
    /* redirect throws by design */
  }
  const calls = vi.mocked(redirect).mock.calls;
  return (calls[calls.length - 1]?.[0] as string) ?? '';
}

const errUrl = (message: string) => '/login?error=' + encodeURIComponent(message);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue({ get: () => '203.0.113.9' } as never);
  vi.mocked(loginGuard).mockResolvedValue('ok');
  vi.mocked(recordLogin).mockResolvedValue(undefined);
  signInWithPassword.mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
  vi.mocked(resetSessionMarkers).mockResolvedValue(undefined as never);
});

describe('login action — SR-07 lockout guard', () => {
  it('refuses with the generic message when locked, without calling Supabase or recording', async () => {
    vi.mocked(loginGuard).mockResolvedValue('locked');
    const url = await run(VALID);
    expect(url).toBe(errUrl(LOGIN_GENERIC_ERROR));
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(recordLogin).not.toHaveBeenCalled();
    // F-22 / SR-18: the lockout block is logged as a security event (hashed ref, never the email).
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'login_blocked', action: 'signin', outcome: 'locked' }),
    );
  });

  it('passes the forwarded IP to the guard, then signs in on ok', async () => {
    const url = await run(VALID);
    expect(loginGuard).toHaveBeenCalledWith('a@example.com', '203.0.113.9');
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(recordLogin).toHaveBeenCalledWith('a@example.com', '203.0.113.9', true);
    expect(url).toBe('/dashboard');
    expect(resetSessionMarkers).toHaveBeenCalledTimes(1);
  });

  it('fails open: a guard error (null) still lets the sign-in proceed', async () => {
    vi.mocked(loginGuard).mockResolvedValue(null);
    const url = await run(VALID);
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(url).toBe('/dashboard');
  });

  it('records a failure and shows the generic message on a wrong password', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const url = await run(VALID);
    expect(recordLogin).toHaveBeenCalledWith('a@example.com', '203.0.113.9', false);
    expect(url).toBe(errUrl(LOGIN_GENERIC_ERROR));
    expect(decodeURIComponent(url).toLowerCase()).not.toContain('invalid login');
    // F-22 / SR-18: the failed sign-in is logged as a security event, not the raw Supabase error.
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'login_failed',
        action: 'signin',
        outcome: 'wrong_password',
      }),
    );
  });

  it('refuses missing fields before touching the guard', async () => {
    await run({ email: '', password: '' });
    expect(loginGuard).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
