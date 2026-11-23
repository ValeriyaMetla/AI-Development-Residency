import { describe, it, expect } from 'vitest';
import {
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  parseMarker,
  sessionTimeoutState,
} from '@/lib/domain/session-timeout';

/**
 * Session limits (ADR-0033 point 1 · PenTest F-05 · SR-08, SR-09): current NIST SP 800-63B AAL2 —
 * re-login at most every 24 hours, sign-out after 1 hour without activity. Supabase's own session
 * limits need the Pro plan, so the app enforces these from two small markers: when the session started
 * and when it was last used.
 */

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

describe('the limits are the current NIST AAL2 values', () => {
  it('24 hours overall, 1 hour idle', () => {
    expect(SESSION_MAX_MS).toBe(24 * HOUR);
    expect(SESSION_IDLE_MS).toBe(1 * HOUR);
  });
});

describe('sessionTimeoutState', () => {
  it('is active when started recently and used recently', () => {
    expect(
      sessionTimeoutState({ now: NOW, startedAt: NOW - 2 * HOUR, lastActiveAt: NOW - 5 * 60_000 }),
    ).toBe('active');
  });

  it('expires after more than 1 hour without activity', () => {
    expect(
      sessionTimeoutState({ now: NOW, startedAt: NOW - 2 * HOUR, lastActiveAt: NOW - HOUR - 1 }),
    ).toBe('idle');
  });

  it('is still active at exactly 1 hour idle', () => {
    expect(
      sessionTimeoutState({ now: NOW, startedAt: NOW - 2 * HOUR, lastActiveAt: NOW - HOUR }),
    ).toBe('active');
  });

  it('expires more than 24 hours after sign-in, even if used a minute ago', () => {
    expect(
      sessionTimeoutState({ now: NOW, startedAt: NOW - 24 * HOUR - 1, lastActiveAt: NOW - 60_000 }),
    ).toBe('too_old');
  });

  it('a missing marker starts the session fresh rather than signing out (sessions from before this change)', () => {
    expect(sessionTimeoutState({ now: NOW, startedAt: null, lastActiveAt: null })).toBe('start');
    expect(sessionTimeoutState({ now: NOW, startedAt: NOW - HOUR, lastActiveAt: null })).toBe(
      'start',
    );
    expect(sessionTimeoutState({ now: NOW, startedAt: null, lastActiveAt: NOW })).toBe('start');
  });

  it('a marker from the future (clock skew or tampering) is treated as expired, not trusted', () => {
    expect(sessionTimeoutState({ now: NOW, startedAt: NOW + HOUR, lastActiveAt: NOW })).toBe(
      'too_old',
    );
    expect(sessionTimeoutState({ now: NOW, startedAt: NOW - HOUR, lastActiveAt: NOW + HOUR })).toBe(
      'idle',
    );
  });
});

describe('parseMarker', () => {
  it('reads a millisecond timestamp', () => {
    expect(parseMarker(String(NOW))).toBe(NOW);
  });

  it.each([undefined, '', 'abc', '-5', '1.5e3x', '0'])('treats %j as missing', (raw) => {
    expect(parseMarker(raw)).toBeNull();
  });
});
