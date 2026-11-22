import { describe, it, expect } from 'vitest';
import {
  POLICY_CHANGE_MESSAGES,
  discardDraftsResult,
  policyActivationResult,
} from '@/lib/domain/policy-activation';

/**
 * Policy activation outcomes (ADR-0031 · PenTest F-03, F-18 · SR-04, SR-14). The database's
 * activate_policy / discard_draft_policies decide; this pure helper only turns their answer into
 * "done" or a plain message. It FAILS CLOSED: only an explicit 'ok' counts, so a failed switch is
 * never reported as "activated" (F-18).
 */

describe('policyActivationResult', () => {
  it('succeeds only on an explicit ok', () => {
    expect(policyActivationResult('ok')).toEqual({ ok: true });
  });

  it.each([
    ['not_leader', POLICY_CHANGE_MESSAGES.not_leader],
    ['not_found', POLICY_CHANGE_MESSAGES.not_found],
    ['not_draft', POLICY_CHANGE_MESSAGES.not_draft],
    ['no_rules', POLICY_CHANGE_MESSAGES.no_rules],
  ])('refuses %s with its own message', (outcome, message) => {
    expect(policyActivationResult(outcome)).toEqual({ ok: false, message });
  });

  it.each([null, undefined, '', 'not_signed_in', 'OK', 'activated', 'something-new'])(
    'fails closed on %j with the "couldn\'t switch on" message',
    (outcome) => {
      expect(policyActivationResult(outcome as string | null)).toEqual({
        ok: false,
        message: POLICY_CHANGE_MESSAGES.unavailable,
      });
    },
  );

  // F-18's honest promise: a failed switch tells the leader nothing changed. (not_leader is a role
  // refusal, not a failed change, so it explains who can act instead.)
  it('every failed switch says nothing was changed', () => {
    for (const key of ['not_found', 'not_draft', 'no_rules', 'unavailable'] as const)
      expect(POLICY_CHANGE_MESSAGES[key]).toMatch(/Nothing was changed\./);
  });
});

describe('discardDraftsResult', () => {
  it('succeeds only on an explicit ok', () => {
    expect(discardDraftsResult('ok')).toEqual({ ok: true });
  });

  it('tells a non-leader why', () => {
    expect(discardDraftsResult('not_leader')).toEqual({
      ok: false,
      message: POLICY_CHANGE_MESSAGES.not_leader,
    });
  });

  it.each([null, 'not_found', 'not_signed_in', 'weird'])('fails closed on %j', (outcome) => {
    expect(discardDraftsResult(outcome)).toEqual({
      ok: false,
      message: POLICY_CHANGE_MESSAGES.discardFailed,
    });
  });
});
