import {
  createPolicy,
  insertPolicyRules,
  activatePolicy,
  type PolicyRule,
  type NewPolicyRule,
} from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { assembleEditedRules, type ParsedPolicyEdit } from '@/lib/domain/policy-edit';
import { policyActivationResult } from '@/lib/domain/policy-activation';

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
  // Safety floor: an active policy always carries its baseline rules, so an empty `current` means the
  // rules could not be read. Publishing from it would create a version WITHOUT the locked baselines
  // (every caller — the editor and accepting a suggestion — passes through here). Fail closed.
  if (params.current.length === 0) {
    return { status: 'failed', message: 'Could not load your current rules. Nothing was changed.' };
  }

  const assembled = assembleEditedRules(params.current, params.input);
  if (!assembled.ok) return { status: 'blocked', message: assembled.error };

  const policyId = await createPolicy({ orgId: params.orgId, name: params.policyName });
  if (!policyId) return { status: 'failed', message: 'Could not create the new policy version.' };

  const rulesOk = await insertPolicyRules(policyId, assembled.rules);
  if (!rulesOk) return { status: 'failed', message: 'Could not save the edited rules.' };

  // One protected all-or-nothing switch (ADR-0031): on any refusal the old version stays active.
  const activated = policyActivationResult(await activatePolicy(policyId));
  if (!activated.ok) return { status: 'failed', message: activated.message };

  await writeAuditEvent({
    orgId: params.orgId,
    taskRunId: null,
    actor: params.createdBy,
    eventType: 'policy_edited',
    payload: { policyId, ruleCount: assembled.rules.length }, // no rule text (ADR-6)
  });

  return { status: 'published', policyId, ruleCount: assembled.rules.length };
}

/**
 * Publish an IMPORTED policy as a new active version (Epic 1 portability). Takes a validated,
 * ready-to-insert ruleset (from parsePolicyImport) rather than a diff, then create -> insert ->
 * activate, the same versioned path as an edit (ADR-0024). Audited as a `policy_edited` event (an
 * allowed kind — ADR-0026) with `source: 'import'` so the trail distinguishes it; no new audit kind,
 * no migration. Fails closed at each write.
 */
export async function publishImportedPolicy(params: {
  orgId: string;
  createdBy: string;
  policyName: string;
  rules: NewPolicyRule[];
}): Promise<PublishEditResult> {
  if (params.rules.length === 0) {
    return { status: 'blocked', message: 'The imported policy has no rules.' };
  }

  const policyId = await createPolicy({ orgId: params.orgId, name: params.policyName });
  if (!policyId)
    return { status: 'failed', message: 'Could not create the imported policy version.' };

  const rulesOk = await insertPolicyRules(policyId, params.rules);
  if (!rulesOk) return { status: 'failed', message: 'Could not save the imported rules.' };

  // One protected all-or-nothing switch (ADR-0031): on any refusal the old version stays active.
  const activated = policyActivationResult(await activatePolicy(policyId));
  if (!activated.ok) return { status: 'failed', message: activated.message };

  await writeAuditEvent({
    orgId: params.orgId,
    taskRunId: null,
    actor: params.createdBy,
    eventType: 'policy_edited',
    payload: { policyId, ruleCount: params.rules.length, source: 'import' }, // no rule text (ADR-6)
  });

  return { status: 'published', policyId, ruleCount: params.rules.length };
}
