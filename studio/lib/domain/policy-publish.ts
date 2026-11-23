import {
  createPolicy,
  insertPolicyRules,
  activatePolicy,
  getActivePolicy,
  getPolicyRulesOrNull,
  type PolicyRule,
  type NewPolicyRule,
} from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { getAllStandardRules } from '@/lib/data/standards';
import { assembleEditedRules, type ParsedPolicyEdit } from '@/lib/domain/policy-edit';
import { policyActivationResult } from '@/lib/domain/policy-activation';
import { generatePolicyRules, indexStandardsByCode } from '@/lib/domain/policy-generator';
import { recommendedSeedAnswers } from '@/lib/domain/policy-seed-spec';
import { flagCommandLikeRules, type FlaggedRule } from '@/lib/domain/policy-injection-scan';

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

// ---------------------------------------------------------------------------------------------------
// Import (ADR-0032 points 3–4 · PenTest F-08, F-20 · SR-05, SR-13): a reviewed DRAFT, never instant,
// that always keeps the org's safety rules. The leader sees a preview (with any command-like warnings)
// and switches it on through the protected activate_policy step (ADR-0031).
// ---------------------------------------------------------------------------------------------------

export type ImportDraftResult =
  | {
      status: 'preview';
      policyId: string;
      ruleCount: number;
      /** The locked safety rules kept in the draft, whatever the file contained. */
      keptSafetyRules: string[];
      /** The file's own rules, as they'll appear (never locked). */
      importedRules: string[];
      /** Imported rules that read like commands to the AI — warned, never blocked. */
      flagged: FlaggedRule[];
    }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

const IMPORT_NOTHING_CHANGED = 'Could not prepare the imported policy. Nothing was changed.';

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function asNewRule(r: PolicyRule): NewPolicyRule {
  return {
    ruleText: r.ruleText,
    standardRuleId: r.standardRuleId,
    citation: r.citation,
    category: r.category,
    riskTier: r.riskTier,
    origin: r.origin,
    isBaselineSafety: true,
    needsReview: r.needsReview,
    sourceQuestion: r.sourceQuestion,
  };
}

/**
 * The org's safety floor for a new version: the active policy's locked rules; or — if there's no
 * active policy, or it has no locked rules (possible after the old F-08 gap) — the protective default
 * set (every safety rule on, recommendedSeedAnswers). `null` = couldn't be built; fail closed.
 */
async function safetyFloor(orgId: string, leaderName: string): Promise<NewPolicyRule[] | null> {
  const active = await getActivePolicy(orgId);
  if (active) {
    const current = await getPolicyRulesOrNull(active.id);
    if (current === null) return null;
    const locked = current.filter((r) => r.isBaselineSafety).map(asNewRule);
    if (locked.length > 0) return locked;
  }
  const standards = await getAllStandardRules();
  if (standards.length === 0) return null;
  const protective = generatePolicyRules(
    recommendedSeedAnswers(leaderName),
    indexStandardsByCode(standards),
  ).filter((r) => r.isBaselineSafety);
  return protective.length > 0 ? protective : null;
}

/**
 * Prepare an imported policy as a DRAFT for the leader to review. Nothing changes for the org until
 * the leader activates it (activateImportedPolicy). The file's own rules are never locked (its
 * isBaselineSafety flag is ignored), the org's safety floor is always included, and an imported copy
 * of a kept safety rule is dropped. Fails closed: on any failure nothing is written that matters (a
 * partial draft is never activated).
 */
export async function draftImportedPolicy(params: {
  orgId: string;
  createdBy: string;
  leaderName: string;
  policyName: string;
  rules: NewPolicyRule[];
}): Promise<ImportDraftResult> {
  if (params.rules.length === 0) {
    return { status: 'blocked', message: 'The imported policy has no rules.' };
  }

  const floor = await safetyFloor(params.orgId, params.leaderName);
  if (floor === null) return { status: 'failed', message: IMPORT_NOTHING_CHANGED };

  const importedRules: NewPolicyRule[] = params.rules
    .filter((r) => !floor.some((s) => sameText(s.ruleText, r.ruleText)))
    .map((r) => ({
      ...r,
      isBaselineSafety: false,
      origin: r.origin === 'baseline' ? 'custom' : r.origin,
    }));

  const policyId = await createPolicy({ orgId: params.orgId, name: params.policyName });
  if (!policyId) return { status: 'failed', message: IMPORT_NOTHING_CHANGED };

  const all = [...floor, ...importedRules];
  const rulesOk = await insertPolicyRules(policyId, all);
  if (!rulesOk) return { status: 'failed', message: IMPORT_NOTHING_CHANGED };

  return {
    status: 'preview',
    policyId,
    ruleCount: all.length,
    keptSafetyRules: floor.map((r) => r.ruleText),
    importedRules: importedRules.map((r) => r.ruleText),
    flagged: flagCommandLikeRules(importedRules),
  };
}

export type ActivateImportResult = { status: 'activated' } | { status: 'failed'; message: string };

/**
 * Switch on a reviewed import draft through the protected activate_policy step (ADR-0031), then audit
 * it as a `policy_edited` event with `source: 'import'` (an allowed kind, ADR-0026; no rule text,
 * ADR-6). On any refusal nothing changed and nothing is audited.
 */
export async function activateImportedPolicy(params: {
  orgId: string;
  createdBy: string;
  policyId: string;
}): Promise<ActivateImportResult> {
  const activated = policyActivationResult(await activatePolicy(params.policyId));
  if (!activated.ok) return { status: 'failed', message: activated.message };

  await writeAuditEvent({
    orgId: params.orgId,
    taskRunId: null,
    actor: params.createdBy,
    eventType: 'policy_edited',
    payload: { policyId: params.policyId, source: 'import' },
  });
  return { status: 'activated' };
}
