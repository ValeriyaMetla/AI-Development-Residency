/**
 * Domain (ADR-0003): the login-lockout decision (ADR-0037 · PenTest F-04 · SR-07).
 *
 * The DATABASE is the enforcer: login_guard decides locked/ok and login_record tracks failures.
 * This pure helper turns the guard's answer into "proceed or not" and provides the single generic
 * message. It FAILS OPEN (ADR-0037 decision A): only an explicit 'locked' blocks the sign-in, so a
 * database blip can't lock every user out — the password is still required either way.
 * Non-disclosure: the same message is shown for a wrong password AND a lockout, so neither reveals
 * account existence nor that a lock is in effect.
 */

/** Shown for both a wrong password and a lockout — never reveals which, nor whether the account exists. */
export const LOGIN_GENERIC_ERROR = 'Email or password is incorrect.';

/** Only an explicit 'locked' from login_guard blocks the sign-in; anything else fails open. */
export function loginBlocked(guardOutcome: string | null | undefined): boolean {
  return guardOutcome === 'locked';
}
