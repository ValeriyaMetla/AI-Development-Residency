import {
  createPolicy,
  insertPolicyRules,
  activatePolicy,
  type PolicyRule,
} from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { assembleEditedRules, type ParsedPolicyEdit } from '@/lib/domain/policy-edit';

/**
 * Policy-edit orchestration (Domain layer, ADR-0003 / ADR-0024) — the side-effecting half of policy
 * editing, kept separate from the pure logic in policy-edit.ts so that pure module stays free of any
 * data import (a client component imports a constant from it). This module calls the Data-Source
 * writers and is server-only; only the Service action imports it.
 */

export type PublishEditResult =
  | { status: 'published'; policyId: string; ruleCount: number }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/**
 * Publish an edited policy as a NEW active version (ADR-0024). Assembles the ruleset, then
 * createPolicy -> insertPolicyRules -> activatePolicy (archives the old active). Fails closed at
 * each write. Nothing is thrown past this layer (ADR-14).
 */
export async function publishEditedPolicy(params: {
  orgId: string;
  createdBy: string;
  policyName: string;
  current: PolicyRule[];
  input: ParsedPolicyEdit;
}): Promise<PublishEditResult> {
  const assembled = assembleEditedRules(params.current, params.input);
  if (!assembled.ok) return { status: 'blocked', message: assembled.error };

  const policyId = await createPolicy({ orgId: params.orgId, name: params.policyName });
  if (!policyId) return { status: 'failed', message: 'Could not create the new policy version.' };

  const rulesOk = await insertPolicyRules(policyId, assembled.rules);
  if (!rulesOk) return { status: 'failed', message: 'Could not save the edited rules.' };

  const activated = await activatePolicy({ orgId: params.orgId, policyId });
  if (!activated) return { status: 'failed', message: 'Could not activate the new version.' };

  await writeAuditEvent({
    orgId: params.orgId,
    taskRunId: null,
    actor: params.createdBy,
    eventType: 'policy_edited',
    payload: { policyId, ruleCount: assembled.rules.length }, // no rule text (ADR-6)
  });

  return { status: 'published', policyId, ruleCount: assembled.rules.length };
}
