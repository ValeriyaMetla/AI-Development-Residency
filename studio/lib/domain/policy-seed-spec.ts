import type { PolicyRuleOrigin } from '@/lib/data/policy';

/**
 * Policy-seed rule specification (Domain layer, ADR-0003 / ADR-0009).
 *
 * The declarative encoding of the locked v1.0 seed question set: it maps each intake
 * answer to the `standard_rule`(s) it seeds, with plain-language text, provenance, and
 * the risk-first flags. This is pure data + pure predicates (no I/O), so the generator
 * (T2) and its tests can consume it without a DB. Every rule is grounded in a seeded
 * `standard_rule` (ADR-0008); variable custom prohibited-uses (Q7 free text) are not in
 * this fixed spec and are expanded by the generator.
 *
 * Source of truth for the questions + text: docs/specs/epic-1-policy-seed-question-set.md.
 */

/** A defaultable/optional yes-no answer; "not_sure" triggers the safe default. */
export type TriState = 'yes' | 'no' | 'not_sure';

/** The intake answers (Q1-Q7) — the contract between the intake flow and the generator. */
export type PolicySeedAnswers = {
  /** Q1 (Required): who is accountable for AI use. */
  accountablePerson: { name: string; role: string };
  /** Q2 (Required, >=1): what the org will use AI for. */
  purposes: string[];
  /** Q3 (Defaultable): will AI handle personal/sensitive info. */
  handlesSensitiveData: TriState;
  /** Q4 (Defaultable): will AI help with higher-stakes work. */
  higherStakes: TriState;
  /** Q5 (Optional, undefined = skipped): will AI content go to people outside the org. */
  externalContent?: TriState;
  /** Q6 (Optional, blank = use the accountable person): who reviews higher-stakes output. */
  reviewer?: string;
  /** Q7 (Optional): the org's own prohibited uses, added on top of the locked baseline. */
  customProhibitedUses?: string[];
};

/** Whether a spec rule applies to a given answer set, and whether a safe default produced it. */
export type RuleGateResult = { include: boolean; viaDefault: boolean };

/** One fixed rule in the seed spec. */
export type RuleSpec = {
  /** Stable internal id for this spec entry (used by tests / debugging). */
  id: string;
  /** The source `standard_rule` code this rule derives from (ADR-0008). */
  standardCode: string;
  /** How the rule arose: inherited from a standard, an always-on baseline, etc. */
  origin: PolicyRuleOrigin;
  /** Non-overridable baseline-safety rule (ADR-0009). */
  isBaselineSafety: boolean;
  /** Which intake question produced it (null = auto-seeded, no question). */
  sourceQuestion: string | null;
  /** Decide inclusion for these answers (include + whether a safe default applied). */
  gate: (answers: PolicySeedAnswers) => RuleGateResult;
  /**
   * Optional plain-language text for the rule. When omitted, the generator uses the
   * source `standard_rule`'s own rule_text (already plain-language). Provided here only
   * where the rule is templated from an answer (Q1/Q2/Q6) or is a fixed baseline (Q7).
   */
  text?: (answers: PolicySeedAnswers) => string;
};

// Gate helpers --------------------------------------------------------------

/** Always include; never via a default. */
const always = (): RuleGateResult => ({ include: true, viaDefault: false });

/** Defaultable gate: include unless answered "no"; "not_sure" counts as a safe default. */
const includeUnlessNo =
  (pick: (a: PolicySeedAnswers) => TriState | undefined) =>
  (answers: PolicySeedAnswers): RuleGateResult => {
    const value = pick(answers);
    if (value === 'no') return { include: false, viaDefault: false };
    // "yes" is an explicit choice; "not_sure" or skipped (undefined) is the fail-safe default.
    return { include: true, viaDefault: value !== 'yes' };
  };

/** The accountable person as a display string, used as the default reviewer (Q6). */
function accountablePersonLabel(a: PolicySeedAnswers): string {
  return `${a.accountablePerson.name} (${a.accountablePerson.role})`;
}

// The spec ------------------------------------------------------------------

/**
 * The fixed seed rules, in a stable order. Variable custom prohibited-uses (Q7) are
 * expanded separately by the generator (one `custom` rule per free-text entry).
 */
export const POLICY_SEED_SPEC: RuleSpec[] = [
  // Q1 - accountable person (always; non-overridable).
  {
    id: 'q1-accountable-person',
    standardCode: 'nist-human-oversight',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q1',
    gate: always,
    text: (a) =>
      `${a.accountablePerson.name}, ${a.accountablePerson.role}, is accountable for the organization's AI use and has the final say - AI assists, people decide.`,
  },
  // Q2 - recorded purpose (always).
  {
    id: 'q2-purpose',
    standardCode: 'nist-document-use',
    origin: 'standard',
    isBaselineSafety: false,
    sourceQuestion: 'Q2',
    gate: always,
    text: (a) =>
      `We record what we use AI for (${a.purposes.join(', ')}), its context, and who is responsible, before relying on it.`,
  },
  // Q3 - data governance (if sensitive data; default yes).
  {
    id: 'q3-data-governance',
    standardCode: 'iso42001-data-governance',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q3',
    gate: includeUnlessNo((a) => a.handlesSensitiveData),
  },
  // Q4 - check output (if higher-stakes; default yes).
  {
    id: 'q4-check-output',
    standardCode: 'nist-check-output',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q4',
    gate: includeUnlessNo((a) => a.higherStakes),
  },
  // Q4 - match safeguards to risk (if higher-stakes; default yes).
  {
    id: 'q4-match-risk',
    standardCode: 'euaiact-match-risk',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q4',
    gate: includeUnlessNo((a) => a.higherStakes),
  },
  // Q4 + Q6 - human review/override, naming the reviewer (if higher-stakes; default yes).
  {
    id: 'q4-human-override',
    standardCode: 'euaiact-human-override',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q4/Q6',
    gate: includeUnlessNo((a) => a.higherStakes),
    text: (a) => {
      const reviewer = a.reviewer?.trim() ? a.reviewer.trim() : accountablePersonLabel(a);
      return `Before higher-stakes AI output is used or sent, ${reviewer} reviews and approves it.`;
    },
  },
  // Q5 - disclose AI to outsiders (default yes when skipped/not sure).
  {
    id: 'q5-disclose-ai',
    standardCode: 'euaiact-disclose-ai',
    origin: 'standard',
    isBaselineSafety: false,
    sourceQuestion: 'Q5',
    gate: includeUnlessNo((a) => a.externalContent),
  },
  // Auto-seeded baselines (no question; always on; non-overridable).
  {
    id: 'baseline-managed-logging',
    standardCode: 'iso42001-managed-logging',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
  },
  {
    id: 'baseline-records',
    standardCode: 'iso42001-records',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
  },
  // Q7 - locked prohibited uses (always on; non-overridable).
  {
    id: 'q7-prohibit-manipulation',
    standardCode: 'euaiact-match-risk',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: 'Q7',
    gate: always,
    text: () => "We won't use AI to manipulate or deceive people.",
  },
  {
    id: 'q7-prohibit-scoring-people',
    standardCode: 'euaiact-match-risk',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: 'Q7',
    gate: always,
    text: () => "We won't use AI to score, rank, or judge people (for example, who deserves help).",
  },
  {
    id: 'q7-prohibit-banned',
    standardCode: 'euaiact-match-risk',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: 'Q7',
    gate: always,
    text: () => "We won't use AI for any legally banned purpose.",
  },
];

/** Category/risk-tier assigned to custom (Q7) rules, which have no source standard. */
export const CUSTOM_PROHIBITED_USE = { category: 'prohibited-use', riskTier: 'all' } as const;

/** The nine baseline `standard_rule` codes the spec must cover (ADR-0008 seed). */
export const EXPECTED_STANDARD_CODES = [
  'nist-human-oversight',
  'nist-document-use',
  'nist-check-output',
  'euaiact-match-risk',
  'euaiact-human-override',
  'euaiact-disclose-ai',
  'iso42001-data-governance',
  'iso42001-managed-logging',
  'iso42001-records',
] as const;
