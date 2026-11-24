import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The sign-up action applies the limits before any account is created (ADR-0034 · PenTest F-07 /
 * F-10 · SR-11 / SR-12 / SR-20): over-length names and a tripped per-IP limit are refused BEFORE
 * supabase.auth.signUp, the gate fails closed, and Supabase's raw error is never echoed back.
 */

vi.mock('next/navigation', () => ({
  // The real redirect() throws to stop the action; the mock does too, so control flow matches.
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
vi.mock('@/lib/data/signup-limits', () => ({ claimSignupAttempt: vi.fn() }));

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, resetSessionMarkers } from '@/lib/data/supabase/server';
import { claimSignupAttempt } from '@/lib/data/signup-limits';
import {
  SIGNUP_THROTTLE_MESSAGES,
  SIGNUP_ERROR_MESSAGES,
  ORG_NAME_MAX,
} from '@/lib/domain/signup-limits';
import { signup } from '@/app/auth/actions';

const signUp = vi.fn();

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = {
  email: 'a@example.com',
  password: 'Str0ng!pass',
  org_name: 'Riverbend',
  display_name: 'Sam',
};

/** Run the action, swallowing the redirect throw; returns the URL redirect was called with. */
async function run(fields: Record<string, string>): Promise<string> {
  try {
    await signup(form(fields));
  } catch {
    /* redirect throws by design */
  }
  const calls = vi.mocked(redirect).mock.calls;
  return (calls[calls.length - 1]?.[0] as string) ?? '';
}

const errUrl = (message: string) => '/signup?error=' + encodeURIComponent(message);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue({ get: () => '203.0.113.9' } as never);
  vi.mocked(claimSignupAttempt).mockResolvedValue('ok');
  signUp.mockResolvedValue({
    data: { user: { id: 'u1' }, session: { access_token: 't' } },
    error: null,
  });
  vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
  vi.mocked(resetSessionMarkers).mockResolvedValue(undefined as never);
});

describe('signup action — SR-11 name length', () => {
  it('refuses an over-length org name before the gate and before signUp', async () => {
    const url = await run({ ...VALID, org_name: 'x'.repeat(ORG_NAME_MAX + 1) });
    expect(url).toContain('/signup?error=');
    expect(claimSignupAttempt).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('signup action — SR-12 per-IP gate (fails closed)', () => {
  it('passes the forwarded IP to the gate, then proceeds on ok', async () => {
    const url = await run(VALID);
    expect(claimSignupAttempt).toHaveBeenCalledWith('203.0.113.9');
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(url).toBe('/dashboard');
    expect(resetSessionMarkers).toHaveBeenCalledTimes(1);
  });

  it('refuses on ip_hour, before signUp', async () => {
    vi.mocked(claimSignupAttempt).mockResolvedValue('ip_hour');
    const url = await run(VALID);
    expect(url).toBe(errUrl(SIGNUP_THROTTLE_MESSAGES.ip_hour));
    expect(signUp).not.toHaveBeenCalled();
  });

  it('fails closed when the gate errors (null), before signUp', async () => {
    vi.mocked(claimSignupAttempt).mockResolvedValue(null);
    const url = await run(VALID);
    expect(url).toBe(errUrl(SIGNUP_THROTTLE_MESSAGES.unavailable));
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('signup action — F-10 non-disclosure', () => {
  it('maps "User already registered" to the neutral message, never echoing it', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    const url = await run(VALID);
    expect(url).toBe(errUrl(SIGNUP_ERROR_MESSAGES.exists));
    expect(decodeURIComponent(url).toLowerCase()).not.toContain('already registered');
  });

  it('turns a weak-password error into plain words', async () => {
    signUp.mockResolvedValue({
      data: {},
      error: { message: 'Password should be at least 8 characters' },
    });
    const url = await run(VALID);
    expect(url).toBe(errUrl(SIGNUP_ERROR_MESSAGES.weak_password));
  });
});

describe('signup action — required fields', () => {
  it('refuses missing fields before touching the gate', async () => {
    await run({ email: '', password: '', org_name: '', display_name: '' });
    expect(claimSignupAttempt).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });
});
