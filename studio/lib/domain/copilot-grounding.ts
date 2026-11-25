import type { Reason, CopilotVerdict, CopilotTier, Signals, SaferWay } from '@/lib/domain/copilot';

/**
 * Co-Pilot grounding (Domain layer, ADR-0010 §6). PURE functions that attach REAL citations to the
 * engine's reasons. Citations are resolved by code from the standards library (ADR-0008) — the LLM
 * never writes or edits one (the no-fabrication guarantee). Policy-first precedence (§6.4) layers on
 * top in the pipeline once the org's active policy is loaded.
 */

export type CitationSource = 'standard' | 'policy';
export type Citation = { code: string; text: string; source: CitationSource };
export type GroundedReason = Reason & { citations: Citation[] };

/** code -> citation string, built from the standards library (standard_rule rows). */
export type CitationMap = Record<string, string>;

export function buildCitationMap(rules: { code: string; citation: string }[]): CitationMap {
  const map: CitationMap = {};
  for (const r of rules) map[r.code] = r.citation;
  return map;
}

/** Attach real standard citations to each reason, resolved by code (unknown codes are dropped). */
export function groundReasons(reasons: Reason[], citations: CitationMap): GroundedReason[] {
  return reasons.map((r) => ({
    ...r,
    citations: r.citationCodes
      .map((code): Citation | null =>
        citations[code] ? { code, text: citations[code], source: 'standard' } : null,
      )
      .filter((c): c is Citation => c !== null),
  }));
}

/**
 * The always-apply baseline rules (standard_rule.risk_tier = 'all'): human oversight, write-it-down,
 * disclosure, logging, and an honest statement of what the AI cannot do (`nist-capability-limits`,
 * 1b). These hold at EVERY tier (§3.6), so the Co-Pilot surfaces them on any recommendation,
 * including a Minimal one.
 */
export const BASELINE_RULE_CODES = [
  'nist-human-oversight',
  'nist-document-use',
  'euaiact-disclose-ai',
  'nist-capability-limits',
  'iso42001-managed-logging',
  'iso42001-records',
] as const;

/** Resolve the baseline rule codes to citations (those present in the library). */
export function baselineCitations(citations: CitationMap): Citation[] {
  return BASELINE_RULE_CODES.map((code): Citation | null =>
    citations[code] ? { code, text: citations[code], source: 'standard' } : null,
  ).filter((c): c is Citation => c !== null);
}

/**
 * The full recommendation object persisted to copilot_assessment.recommendation (jsonb) and
 * rendered by the UI (design §5.2). The deterministic parts come from the engine + grounding;
 * `summary` is the LLM's (or a templated) one-line explanation; `policyApplied` records whether an
 * active org policy was in force at assessment time.
 */
export type FinalRecommendation = {
  verdict: CopilotVerdict;
  tier: CopilotTier;
  tierLabel: string;
  summary: string;
  signals: Signals;
  reasons: GroundedReason[];
  baselineRules: Citation[];
  saferWay: SaferWay | null;
  humanDecisionRequired: boolean;
  policyApplied: boolean;
};
