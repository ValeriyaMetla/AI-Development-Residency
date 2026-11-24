/**
 * Domain (ADR-0003): the sign-up input rules and limit decision (ADR-0034 · PenTest F-07 / F-10 ·
 * SR-11 / SR-12 / SR-20).
 *
 * Pure, framework-free helpers so the Service action stays thin and every rule is unit-testable in
 * one place. The DATABASE is the real enforcer (CHECK constraints for the name lengths,
 * `claim_signup_attempt` for the per-IP limit); these helpers give the person a plain message and,
 * like the AI rate-limit gate, FAIL CLOSED — anything other than an explicit 'ok' from the counter
 * is a refusal, so a broken or changed counter can never let sign-ups through.
 */

/** Name-length caps — must match the database CHECK constraints in the F-07 migration (ADR-0034). */
export const ORG_NAME_MAX = 120;
export const DISPLAY_NAME_MAX = 80;

/** The real password rule (Supabase Auth settings, group 0). The hint and error must match it. */
export const PASSWORD_HINT =
  'At least 8 characters, with a lowercase letter, an uppercase letter, a number, and a symbol.';

export type NameCheck = { ok: true } | { ok: false; message: string };

/** SR-11: reject over-length names in the app before Supabase, with a plain message. */
export function validateSignupNames(input: { orgName: string; displayName: string }): NameCheck {
  if (input.orgName.length > ORG_NAME_MAX) {
    return { ok: false, message: `Organization name must be ${ORG_NAME_MAX} characters or fewer.` };
  }
  if (input.displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, message: `Your name must be ${DISPLAY_NAME_MAX} characters or fewer.` };
  }
  return { ok: true };
}

export type SignupThrottleDecision = { allowed: true } | { allowed: false; message: string };

export const SIGNUP_THROTTLE_MESSAGES = {
  ip_hour: 'Too many sign-ups from this network right now. Please wait a while and try again.',
  unavailable: "We couldn't complete sign-up just now. Please try again in a minute.",
} as const;

/**
 * SR-12: turn `claim_signup_attempt`'s answer into a decision. Only an explicit 'ok' allows the
 * sign-up; `ip_hour` and anything unrecognised (an error, `null`, a new word) refuse (fail closed).
 */
export function signupThrottleDecision(outcome: string | null | undefined): SignupThrottleDecision {
  if (outcome === 'ok') return { allowed: true };
  if (outcome === 'ip_hour') {
    return { allowed: false, message: SIGNUP_THROTTLE_MESSAGES.ip_hour };
  }
  return { allowed: false, message: SIGNUP_THROTTLE_MESSAGES.unavailable };
}

export const SIGNUP_ERROR_MESSAGES = {
  /**
   * F-10 / SR-20: do not confirm whether an email already has an account. One neutral message,
   * phrased as advice shown to everyone. NOTE: a partial mitigation — with email confirmation off a
   * brand-new sign-up logs straight in, so the two paths still differ behaviourally; full parity
   * needs email confirmation (accepted, deferred, ADR-0034).
   */
  exists:
    "We couldn't create your account with those details. If you already have an account, please log in.",
  weak_password: `Please choose a stronger password. ${PASSWORD_HINT}`,
  generic: "We couldn't create your account. Please check your details and try again.",
} as const;

/**
 * Replace Supabase's raw error with plain words (UX follow-up) and keep F-10's non-disclosure: an
 * "already registered" error becomes the neutral `exists` message, never the raw text.
 */
export function signupErrorMessage(rawError: string): string {
  const e = rawError.toLowerCase();
  if (
    e.includes('already registered') ||
    e.includes('already been registered') ||
    e.includes('already exists')
  ) {
    return SIGNUP_ERROR_MESSAGES.exists;
  }
  if (e.includes('password')) {
    return SIGNUP_ERROR_MESSAGES.weak_password;
  }
  return SIGNUP_ERROR_MESSAGES.generic;
}

/**
 * The client IP for the per-IP sign-up limit. Vercel documents `x-forwarded-for` as "the public IP
 * address of the client that made the request"; its leftmost entry is the client (ADR-0034 point 5).
 * Returns '' when the header is absent (local dev); the database then buckets all header-less
 * attempts together, which is harmless because production always sets the header.
 */
export function firstForwardedIp(xForwardedFor: string | null | undefined): string {
  if (!xForwardedFor) return '';
  return xForwardedFor.split(',')[0].trim();
}
