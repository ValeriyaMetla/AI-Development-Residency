import { getAllStandardRules } from '@/lib/data/standards';
import { createPolicy, insertPolicyRules, savePolicySeedResponse } from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { generatePolicyRules, type StandardsByCode } from '@/lib/domain/policy-generator';
import type { PolicySeedAnswers } from '@/lib/domain/policy-seed-spec';

/**
 * Policy-seed orchestration (Domain layer, ADR-0003 / ADR-0009) — the use-case behind the
 * "Generate a starter policy from answers" ticket. Loads the standards library, runs the
 * deterministic generator, and persists the result via the Data-Source accessors. Nothing
 * is thrown past this layer (ADR-14 resilience); every outcome is a typed result.
 *
 * Human-in-the-loop (responsible-AI): the policy is created as a DRAFT and is NOT activated
 * here. The leader reviews the draft and explicitly activates it (a separate confirm step,
 * wired by the intake-flow ticket via the `activatePolicy` accessor), so an AI-shaped policy
 * never becomes the governing policy without a human gate.
 */

const DEFAULT_POLICY_NAME = 'Starter AI policy';

export type SeedPolicyResult =
  | { status: 'created'; policyId: string; ruleCount: number; needsReviewCount: number }
  | { status: 'failed'; message: string };

export async function seedPolicyFromAnswers(params: {
  orgId: string;
  createdBy: string;
  answers: PolicySeedAnswers;
  policyName?: string;
}): Promise<SeedPolicyResult> {
  const { orgId, createdBy, answers } = params;

  // 1. Load the standards library and index it by code for provenance resolution.
  const standards = await getAllStandardRules();
  if (standards.length === 0) {
    return { status: 'failed', message: 'The standards library is unavailable.' };
  }
  const standardsByCode: StandardsByCode = new Map(
    standards.map((s) => [
      s.code,
      {
        id: s.id,
        citation: s.citation,
        ruleText: s.ruleText,
        category: s.category,
        riskTier: s.riskTier,
      },
    ]),
  );

  // 2. Generate the rules deterministically (no LLM).
  const rules = generatePolicyRules(answers, standardsByCode);

  // 3. Create the policy as a draft (not active — the leader confirms later).
  const policyId = await createPolicy({ orgId, name: params.policyName ?? DEFAULT_POLICY_NAME });
  if (!policyId) {
    return { status: 'failed', message: 'Could not create the policy.' };
  }

  // 4. Persist the generated rules.
  const rulesOk = await insertPolicyRules(policyId, rules);
  if (!rulesOk) {
    return { status: 'failed', message: 'Could not save the policy rules.' };
  }

  // 5. Store the raw answers (immutable record, re-generation source).
  const responseOk = await savePolicySeedResponse({ policyId, answers: { ...answers }, createdBy });
  if (!responseOk) {
    return { status: 'failed', message: 'Could not save the intake answers.' };
  }

  // 6. Audit the action (payload carries no sensitive content, ADR-6).
  const needsReviewCount = rules.filter((r) => r.needsReview).length;
  await writeAuditEvent({
    orgId,
    taskRunId: null,
    actor: createdBy,
    eventType: 'policy_seeded',
    payload: { policyId, ruleCount: rules.length, needsReviewCount },
  });

  return { status: 'created', policyId, ruleCount: rules.length, needsReviewCount };
}
