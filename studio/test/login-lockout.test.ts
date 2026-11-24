import { describe, it, expect } from 'vitest';
import { LOGIN_GENERIC_ERROR, loginBlocked } from '@/lib/domain/login-lockout';

// Domain decision for the login lockout (ADR-0037 · PenTest F-04 · SR-07).

describe('loginBlocked — fails open (ADR-0037)', () => {
  it('blocks only on an explicit locked', () => {
    expect(loginBlocked('locked')).toBe(true);
  });

  it.each(['ok', null, undefined, '', 'surprise'])(
    'does not block on %s (fail open — the password is still required)',
    (outcome) => {
      expect(loginBlocked(outcome as string | null | undefined)).toBe(false);
    },
  );
});

describe('LOGIN_GENERIC_ERROR — non-disclosure', () => {
  it('does not mention a lockout, rate limiting, or account existence', () => {
    expect(LOGIN_GENERIC_ERROR.toLowerCase()).not.toMatch(/lock|too many|attempt|exist|registered/);
  });
});
