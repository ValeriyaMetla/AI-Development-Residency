import { describe, it, expect } from 'vitest';
import {
  ORG_NAME_MAX,
  DISPLAY_NAME_MAX,
  PASSWORD_HINT,
  validateSignupNames,
  signupThrottleDecision,
  SIGNUP_THROTTLE_MESSAGES,
  signupErrorMessage,
  SIGNUP_ERROR_MESSAGES,
  firstForwardedIp,
} from '@/lib/domain/signup-limits';

// Domain rules for sign-up limits (ADR-0034 · PenTest F-07 / F-10 · SR-11 / SR-12 / SR-20).

describe('validateSignupNames (SR-11)', () => {
  it('allows names at the limit', () => {
    expect(
      validateSignupNames({
        orgName: 'x'.repeat(ORG_NAME_MAX),
        displayName: 'y'.repeat(DISPLAY_NAME_MAX),
      }),
    ).toEqual({ ok: true });
  });

  it('allows an empty display name (it is optional)', () => {
    expect(validateSignupNames({ orgName: 'Riverbend', displayName: '' })).toEqual({ ok: true });
  });

  it('rejects an over-length org name with a plain message', () => {
    const r = validateSignupNames({ orgName: 'x'.repeat(ORG_NAME_MAX + 1), displayName: '' });
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ message: expect.stringContaining(String(ORG_NAME_MAX)) });
  });

  it('rejects an over-length display name with a plain message', () => {
    const r = validateSignupNames({ orgName: 'Ok', displayName: 'y'.repeat(DISPLAY_NAME_MAX + 1) });
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ message: expect.stringContaining(String(DISPLAY_NAME_MAX)) });
  });

  it('rejects a 5,000-character name (the pentest payload)', () => {
    expect(validateSignupNames({ orgName: 'A'.repeat(5000), displayName: '' }).ok).toBe(false);
  });
});

describe('signupThrottleDecision (SR-12) — fails closed', () => {
  it('allows only on an explicit ok', () => {
    expect(signupThrottleDecision('ok')).toEqual({ allowed: true });
  });

  it('refuses on ip_hour with a plain message', () => {
    expect(signupThrottleDecision('ip_hour')).toEqual({
      allowed: false,
      message: SIGNUP_THROTTLE_MESSAGES.ip_hour,
    });
  });

  it.each([null, undefined, '', 'surprise', 'OK'])(
    'refuses (unavailable) on anything unrecognised: %s',
    (outcome) => {
      expect(signupThrottleDecision(outcome as string | null | undefined)).toEqual({
        allowed: false,
        message: SIGNUP_THROTTLE_MESSAGES.unavailable,
      });
    },
  );
});

describe('signupErrorMessage (F-10 non-disclosure + plain wording)', () => {
  it('maps "User already registered" to the neutral message, never echoing it', () => {
    const msg = signupErrorMessage('User already registered');
    expect(msg).toBe(SIGNUP_ERROR_MESSAGES.exists);
    expect(msg.toLowerCase()).not.toContain('already registered');
  });

  it('maps other account-exists phrasings to the same neutral message', () => {
    expect(signupErrorMessage('A user with this email address has already been registered')).toBe(
      SIGNUP_ERROR_MESSAGES.exists,
    );
  });

  it('maps a weak-password error to plain words with the rule', () => {
    const msg = signupErrorMessage('Password should be at least 8 characters');
    expect(msg).toBe(SIGNUP_ERROR_MESSAGES.weak_password);
    expect(msg).toContain(PASSWORD_HINT);
  });

  it('falls back to a generic message for anything else', () => {
    expect(signupErrorMessage('some unexpected database error')).toBe(
      SIGNUP_ERROR_MESSAGES.generic,
    );
  });
});

describe('firstForwardedIp', () => {
  it('takes the leftmost entry and trims it', () => {
    expect(firstForwardedIp('203.0.113.7, 70.41.3.18, 150.172.238.178')).toBe('203.0.113.7');
    expect(firstForwardedIp('  203.0.113.7  ')).toBe('203.0.113.7');
  });

  it('returns "" when the header is absent', () => {
    expect(firstForwardedIp(null)).toBe('');
    expect(firstForwardedIp(undefined)).toBe('');
    expect(firstForwardedIp('')).toBe('');
  });
});
