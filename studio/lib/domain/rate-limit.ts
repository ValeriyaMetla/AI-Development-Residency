/**
 * Domain (ADR-0003): the rate-limit decision for AI requests (ADR-0030 · PenTest F-02 · SR-02/03).
 *
 * The DATABASE is the enforcer: `claim_ai_request` checks every limit and records the request in one
 * step. This pure helper only turns its answer into "go" or a plain, blame-free message for the
 * person. It FAILS CLOSED: anything other than an explicit 'ok' — no answer, an error, or a word it
 * doesn't recognise — is a refusal, so a broken or changed counter can never let requests through.
 *
 * It decides only whether a request may START. It never touches a safety step (ADR-0023 §4).
 */

/** The two AI entry points, matching the database's `ai_request.kind` check. */
export type AiRequestKind = 'copilot' | 'skill';

/** What claim_ai_request returns when a limit is reached (nothing was recorded). */
export type RateLimitReason = 'user_minute' | 'user_day' | 'org_day' | 'platform_day';

export type RateLimitDecision = { allowed: true } | { allowed: false; message: string };

/**
 * Shown to the person. No exact numbers: the limits change by migration, and "try again later" is
 * honest about rolling windows (ADR-0030 point 3).
 */
export const RATE_LIMIT_MESSAGES: Record<RateLimitReason | 'unavailable', string> = {
  user_minute: "You're sending requests quickly. Please wait a minute, then try again.",
  user_day: "You've reached today's limit of AI requests for your account. Please try again later.",
  org_day: "Your organization has reached today's limit of AI requests. Please try again later.",
  platform_day:
    'The Studio has paused new AI requests for now because of high demand. Please try again later.',
  unavailable: "We couldn't check your usage just now. Please try again in a minute.",
};

const REASONS: readonly RateLimitReason[] = ['user_minute', 'user_day', 'org_day', 'platform_day'];

function isReason(value: unknown): value is RateLimitReason {
  return typeof value === 'string' && (REASONS as readonly string[]).includes(value);
}

/** Turn the database's answer into a decision. Only an explicit 'ok' allows the request. */
export function rateLimitDecision(outcome: string | null | undefined): RateLimitDecision {
  if (outcome === 'ok') return { allowed: true };
  if (isReason(outcome)) return { allowed: false, message: RATE_LIMIT_MESSAGES[outcome] };
  return { allowed: false, message: RATE_LIMIT_MESSAGES.unavailable };
}
