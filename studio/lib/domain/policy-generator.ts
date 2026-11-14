import type { NewPolicyRule } from '@/lib/data/policy';
import {
  POLICY_SEED_SPEC,
  CUSTOM_PROHIBITED_USE,
  type PolicySeedAnswers,
} from '@/lib/domain/policy-seed-spec';

/**
 * Pure policy generator (Domain layer, ADR-0003 / ADR-0009).
 *
 * Deterministic: turns intake answers into a grounded set of policy rules using the
 * declarative POLICY_SEED_SPEC. No LLM and no I/O — the caller supplies the resolved
 * standards (keyed by code) so this function stays unit-testable without a database.
 *
 * Each rule inherits category/risk_tier and a snapshotted citation from its source
 * standard_rule (point-in-time provenance, ADR-0009). Skipped/"not sure" answers apply
 * the fail-safe default and mark the rule needs_review. Custom prohibited-uses (Q7 free
 * text) become `custom` rules with no standard source.
 */

/** A seeded standard_rule resolved for provenance (its id + the fields we snapshot). */
export type SeedStandard = {
  id: string;
  citation: string;
  ruleText: string;
  category: string;
  riskTier: string;
};

/** Resolved standards, keyed by their stable `code` (ADR-0008). */
export type StandardsByCode = Map<string, SeedStandard>;

/**
 * Generate the policy rules for a completed answer set.
 * Returns the fixed spec rules (in spec order) followed by any custom prohibited-uses.
 * A spec rule whose source standard is missing from `standardsByCode` is skipped rather
 * than emitted uncited (keeps the grounded guarantee).
 */
export function generatePolicyRules(
  answers: PolicySeedAnswers,
  standardsByCode: StandardsByCode,
): NewPolicyRule[] {
  const rules: NewPolicyRule[] = [];

  for (const entry of POLICY_SEED_SPEC) {
    const gate = entry.gate(answers);
    if (!gate.include) continue;
    const standard = standardsByCode.get(entry.standardCode);
    if (!standard) continue; // cannot ground this rule -> skip rather than emit it uncited
    rules.push({
      ruleText: entry.text ? entry.text(answers) : standard.ruleText,
      standardRuleId: standard.id,
      citation: standard.citation,
      category: standard.category,
      riskTier: standard.riskTier,
      origin: entry.origin,
      isBaselineSafety: entry.isBaselineSafety,
      needsReview: gate.viaDefault,
      sourceQuestion: entry.sourceQuestion,
    });
  }

  // Custom prohibited uses (Q7 free text): the org's own additions, no standard source.
  for (const raw of answers.customProhibitedUses ?? []) {
    const text = raw.trim();
    if (!text) continue;
    rules.push({
      ruleText: text,
      standardRuleId: null,
      citation: null,
      category: CUSTOM_PROHIBITED_USE.category,
      riskTier: CUSTOM_PROHIBITED_USE.riskTier,
      origin: 'custom',
      isBaselineSafety: false,
      needsReview: false,
      sourceQuestion: 'Q7',
    });
  }

  return rules;
}
