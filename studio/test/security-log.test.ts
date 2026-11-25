import { describe, it, expect, vi, afterEach } from 'vitest';
import { emailRef, userRef, logSecurityEvent } from '@/lib/security/security-log';

/**
 * Security-event logging (ADR-0040 · PenTest F-22 · SR-18). The app records a PII-safe trace of
 * failed sign-ins and refused access. The two hard rules under test: the account reference is a
 * hash, never the raw email; and the emitted line never carries a password, token, raw email or IP.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const RAW_EMAIL = 'Attacker@Example.com';

describe('emailRef', () => {
  it('is a short hash prefix, never the raw email', () => {
    const ref = emailRef(RAW_EMAIL);
    expect(ref).toMatch(/^e:[0-9a-f]{12}$/);
    expect(ref.toLowerCase()).not.toContain('attacker');
    expect(ref).not.toContain('@');
  });

  it('is case- and whitespace-insensitive (so repeats on one account correlate)', () => {
    expect(emailRef('  attacker@example.com ')).toBe(emailRef('ATTACKER@EXAMPLE.COM'));
  });

  it('separates different accounts', () => {
    expect(emailRef('a@example.com')).not.toBe(emailRef('b@example.com'));
  });
});

describe('userRef', () => {
  it('prefixes the pseudonymous user id', () => {
    expect(userRef('11111111-2222-3333-4444-555555555555')).toBe(
      'u:11111111-2222-3333-4444-555555555555',
    );
  });
});

describe('logSecurityEvent', () => {
  it('emits one structured [security] line with the event fields and a timestamp', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSecurityEvent({
      event: 'login_failed',
      action: 'signin',
      ref: emailRef(RAW_EMAIL),
      outcome: 'wrong_password',
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const [tag, payload] = warn.mock.calls[0];
    expect(tag).toBe('[security]');
    const parsed = JSON.parse(payload as string);
    expect(parsed).toMatchObject({
      event: 'login_failed',
      action: 'signin',
      outcome: 'wrong_password',
    });
    expect(typeof parsed.t).toBe('string');
    expect(parsed.ref).toMatch(/^e:[0-9a-f]{12}$/);
  });

  it('never leaks the raw email into the emitted line (break-it guard)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSecurityEvent({
      event: 'login_failed',
      action: 'signin',
      ref: emailRef(RAW_EMAIL),
      outcome: 'wrong_password',
    });
    const line = (warn.mock.calls[0] ?? []).join(' ').toLowerCase();
    expect(line).not.toContain('attacker');
    expect(line).not.toContain('@example.com');
  });

  it('never throws, even when console.warn throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('log sink down');
    });
    expect(() =>
      logSecurityEvent({ event: 'access_refused', action: 'signup', outcome: 'rate_limited' }),
    ).not.toThrow();
  });
});
