/**
 * Domain (ADR-0003): what a policy activation or "start over" outcome means (ADR-0031 · PenTest
 * F-03, F-18 · SR-04, SR-14).
 *
 * The DATABASE is the enforcer: `activate_policy` and `discard_draft_policies` check the caller is a
 * leader and do the whole change in one all-or-nothing step. This pure helper only turns their answer
 * into "done" or a plain message for the leader. It FAILS CLOSED: anything other than an explicit
 * 'ok' — no answer, an error, or a word it doesn't recognise — is a failure, so a switch that didn't
 * happen is never reported as "activated" (F-18). Every failed switch says nothing was changed,
 * because the database rolled it back and the current policy is still in force.
 */

export type PolicyChangeResult = { ok: true } | { ok: false; message: string };

type ActivationRefusal = 'not_leader' | 'not_found' | 'not_draft' | 'no_rules';

export const POLICY_CHANGE_MESSAGES: Record<
  ActivationRefusal | 'unavailable' | 'discardFailed',
  string
> = {
  not_leader: 'Only an Accountable Leader can change the AI policy.',
  not_found: "We couldn't find that policy. Nothing was changed.",
  not_draft:
    "This version can't be switched on again. Nothing was changed. Your current policy is still active.",
  no_rules: "This policy has no rules yet, so it can't be switched on. Nothing was changed.",
  unavailable:
    "We couldn't switch on the policy just now. Nothing was changed. Your current policy is still active. Please try again.",
  discardFailed: 'Could not start over. Nothing was changed. Please try again.',
};

const REFUSALS: readonly ActivationRefusal[] = ['not_leader', 'not_found', 'not_draft', 'no_rules'];

function isRefusal(value: unknown): value is ActivationRefusal {
  return typeof value === 'string' && (REFUSALS as readonly string[]).includes(value);
}

/** activate_policy's answer → done, or the reason it didn't happen. Only 'ok' succeeds. */
export function policyActivationResult(outcome: string | null | undefined): PolicyChangeResult {
  if (outcome === 'ok') return { ok: true };
  if (isRefusal(outcome)) return { ok: false, message: POLICY_CHANGE_MESSAGES[outcome] };
  return { ok: false, message: POLICY_CHANGE_MESSAGES.unavailable };
}

/** discard_draft_policies' answer → done, or why not. Only 'ok' succeeds. */
export function discardDraftsResult(outcome: string | null | undefined): PolicyChangeResult {
  if (outcome === 'ok') return { ok: true };
  if (outcome === 'not_leader') return { ok: false, message: POLICY_CHANGE_MESSAGES.not_leader };
  return { ok: false, message: POLICY_CHANGE_MESSAGES.discardFailed };
}
