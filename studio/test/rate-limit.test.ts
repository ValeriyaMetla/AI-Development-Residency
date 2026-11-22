import { describe, it, expect } from 'vitest';
import { RATE_LIMIT_MESSAGES, rateLimitDecision } from '@/lib/domain/rate-limit';

/**
 * Rate-limit decision (ADR-0030 · PenTest F-02 · SR-02 / SR-03). The database's claim_ai_request
 * is the enforcer; this pure helper only turns its answer into "go" or a plain message — and treats
 * anything it doesn't recognise as a refusal (fail closed).
 */

describe('rateLimitDecision', () => {
  it('allows only an explicit ok', () => {
    expect(rateLimitDecision('ok')).toEqual({ allowed: true });
  });

  it.each([
    ['user_minute', RATE_LIMIT_MESSAGES.user_minute],
    ['user_day', RATE_LIMIT_MESSAGES.user_day],
    ['org_day', RATE_LIMIT_MESSAGES.org_day],
    ['platform_day', RATE_LIMIT_MESSAGES.platform_day],
  ])('refuses %s with its own message', (outcome, message) => {
    expect(rateLimitDecision(outcome)).toEqual({ allowed: false, message });
  });

  it.each([null, undefined, '', 'not_signed_in', 'not_found', 'invalid', 'OK', 'something-new'])(
    'fails closed on %j — refused with the "couldn\'t check" message',
    (outcome) => {
      expect(rateLimitDecision(outcome as string | null)).toEqual({
        allowed: false,
        message: RATE_LIMIT_MESSAGES.unavailable,
      });
    },
  );

  it('every refusal says what to do next and never blames the person', () => {
    for (const message of Object.values(RATE_LIMIT_MESSAGES)) {
      expect(message).toMatch(/try again/i);
      expect(message).not.toMatch(/abuse|misuse|violat|blocked/i);
    }
  });

  it('messages give no exact limit numbers (they change with each migration)', () => {
    for (const message of Object.values(RATE_LIMIT_MESSAGES)) expect(message).not.toMatch(/\d/);
  });
});
