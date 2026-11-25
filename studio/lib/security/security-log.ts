import { createHash } from 'node:crypto';

/**
 * Security-event logging (ADR-0040 · PenTest F-22 · SR-18).
 *
 * The app writes its own PII-safe trace of failed sign-ins and refused access to the server log, so
 * an attack in progress (password guessing, repeated sign-up abuse) leaves a trace the app records
 * itself — not only the platform logs, which are short-lived on the Free plan. Durable retention,
 * export and alerting are accepted-deferred (a paid plan; see ADR-0040 / R14).
 *
 * NEVER pass a password, token, raw email, raw IP or request payload into an event. The account
 * reference is a short hash prefix (pre-login) or the pseudonymous user id (authenticated).
 */

export type SecurityEventName = 'login_failed' | 'login_blocked' | 'access_refused';

export interface SecurityEvent {
  /** What happened. */
  event: SecurityEventName;
  /** What was attempted, e.g. 'signin', 'signup', 'password_update'. */
  action: string;
  /** A non-PII account reference from emailRef()/userRef(), or omitted when there is none. */
  ref?: string;
  /** Why it failed or was refused, e.g. 'wrong_password', 'locked', 'rate_limited', 'no_session'. */
  outcome: string;
}

/**
 * A non-PII reference for a pre-login email: 'e:' + the first 12 hex characters of its SHA-256 hash
 * (the same lowercased-email basis as ADR-0037's lockout). Correlates repeated attempts on one
 * account without storing the email itself.
 */
export function emailRef(email: string): string {
  const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return 'e:' + hash.slice(0, 12);
}

/** A non-PII reference for an authenticated user: the pseudonymous auth user id. */
export function userRef(userId: string): string {
  return 'u:' + userId;
}

/**
 * Emit one structured security-event line to the server log. Best-effort: never throws, so a
 * logging failure can't change a request's outcome (the same principle as ADR-0037's record path).
 */
export function logSecurityEvent(e: SecurityEvent): void {
  try {
    console.warn('[security]', JSON.stringify({ t: new Date().toISOString(), ...e }));
  } catch {
    /* logging must never break the request */
  }
}
