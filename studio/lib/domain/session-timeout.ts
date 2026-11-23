/**
 * Session limits (Domain layer, ADR-0033 point 1 · PenTest F-05 · SR-08, SR-09). Pure, no I/O.
 *
 * Current NIST SP 800-63B (800-63-4) AAL2: the overall reauthentication timeout "SHOULD be no more than
 * 24 hours", and "The inactivity timeout SHOULD be no more than 1 hour". Supabase's own session limits
 * need the Pro plan, so the app enforces these itself from two markers the middleware keeps in
 * HttpOnly cookies: when the session started, and when it was last used.
 */

export const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 60 * 60 * 1000;

/**
 * - 'active':  within both limits — carry on (and refresh "last used").
 * - 'idle':    more than 1 hour since the last request — sign out.
 * - 'too_old': more than 24 hours since sign-in — sign out.
 * - 'start':   a marker is missing (a session from before this change, or a fresh sign-in) — start
 *              the clock now rather than signing everyone out at deploy.
 */
export type SessionTimeoutState = 'active' | 'idle' | 'too_old' | 'start';

export function sessionTimeoutState(input: {
  now: number;
  startedAt: number | null;
  lastActiveAt: number | null;
}): SessionTimeoutState {
  const { now, startedAt, lastActiveAt } = input;
  if (startedAt === null || lastActiveAt === null) return 'start';
  // A time in the future can't be genuine (clock skew or a tampered marker): don't trust it.
  if (startedAt > now || now - startedAt > SESSION_MAX_MS) return 'too_old';
  if (lastActiveAt > now || now - lastActiveAt > SESSION_IDLE_MS) return 'idle';
  return 'active';
}

/** A marker cookie's value → a positive millisecond timestamp, or null if missing or malformed. */
export function parseMarker(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
