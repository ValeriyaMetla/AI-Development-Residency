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
   * The rule's wording in the org's policy. Every seed rule sets it, so the policy reads in one
   * consistent "we" voice (Val, 2026-11-19); the standards library keeps the standard's own
   * wording for citations and the Co-Pilot. If omitted, the generator falls back to the source
   * `standard_rule`'s rule_text. Changing this wording affects newly generated policies only.
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
      `${accountablePersonLabel(a)} is accountable for our use of AI and has the final say: AI assists, people decide.`,
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
      `We use AI for: ${a.purposes.join('; ')}. Before relying on AI for a task, we record what it is for, its context, and who is responsible.`,
  },
  // Q3 - data governance (if sensitive data; default yes).
  {
    id: 'q3-data-governance',
    standardCode: 'iso42001-data-governance',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q3',
    gate: includeUnlessNo((a) => a.handlesSensitiveData),
    text: () =>
      'We put only the information a task needs into AI, check that it is accurate, and protect personal and sensitive information.',
  },
  // Q4 - check output (if higher-stakes; default yes).
  {
    id: 'q4-check-output',
    standardCode: 'nist-check-output',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q4',
    gate: includeUnlessNo((a) => a.higherStakes),
    text: () =>
      'We check AI output for errors, bias, or harm before acting on it, and take more care the higher the stakes.',
  },
  // Q4 - match safeguards to risk (if higher-stakes; default yes).
  {
    id: 'q4-match-risk',
    standardCode: 'euaiact-match-risk',
    origin: 'standard',
    isBaselineSafety: true,
    sourceQuestion: 'Q4',
    gate: includeUnlessNo((a) => a.higherStakes),
    text: () =>
      'We match our safeguards to the level of risk: the higher the stakes, the stronger the checks.',
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
      return `Before higher-stakes AI output is used or sent, ${reviewer} reviews it and can approve, change, or stop it.`;
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
    text: () => 'We tell people when they are dealing with AI, and we label AI-generated content.',
  },
  // Auto-seeded baselines (no question; always on; non-overridable).
  {
    id: 'baseline-managed-logging',
    standardCode: 'iso42001-managed-logging',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () => 'We log how AI is used and review that use regularly.',
  },
  {
    id: 'baseline-records',
    standardCode: 'iso42001-records',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () => 'We keep records that show how AI-assisted work was produced and who checked it.',
  },
  // 1b accuracy / output-quality baselines (auto-seeded; always on; non-overridable). These reach the
  // Challenger via the generated policy, so every governed draft is checked against them (ADR-0042 / 1b).
  {
    id: 'baseline-uncertainty',
    standardCode: 'nist-uncertainty',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () =>
      'We say plainly when something is uncertain or unverified, and never present a guess as a confirmed fact.',
  },
  {
    id: 'baseline-safe-abstention',
    standardCode: 'nist-safe-abstention',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () =>
      'When we do not have enough to answer safely, we hold back the unsupported part and point to a verified next step instead of guessing.',
  },
  {
    id: 'baseline-source-traceability',
    standardCode: 'nist-source-traceability',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () => 'We tie factual claims to a real, checkable source, and never make up a citation.',
  },
  {
    id: 'baseline-evidence-grounding',
    standardCode: 'nist-evidence-grounding',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: null,
    gate: always,
    text: () =>
      "We back factual claims with evidence from a reviewed source, keep confirmed facts separate from guesses, and don't fill gaps by making things up.",
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
    standardCode: 'euaiact-no-scoring',
    origin: 'baseline',
    isBaselineSafety: true,
    sourceQuestion: 'Q7',
    gate: always,
    text: () =>
      "We don't let AI decide or predict judgments about people (who is eligible, at risk, deserving, or likely to succeed). AI can organize information and apply our own written rules to help, but a person makes the call.",
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

/** The `standard_rule` codes the policy seed spec references (ADR-0008 seed + the Release 1b
 *  accuracy / output-quality rows and the dedicated no-scoring row, ADR-0042). The spec must cover
 *  each of these, and reference no others. */
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
  // 1b accuracy / output-quality + dedicated no-scoring (ADR-0042).
  'nist-uncertainty',
  'nist-safe-abstention',
  'nist-source-traceability',
  'nist-evidence-grounding',
  'euaiact-no-scoring',
] as const;

/**
 * The purposes the seed wizard offers at Q2. Lives here (not in the wizard) so the recommended
 * defaults below are drawn from the same list the leader sees — one source of truth.
 */
export const PURPOSE_OPTIONS = [
  'Drafting emails, letters, or communications',
  'Summarizing documents or notes',
  'Research and finding information',
  'Writing or editing content (reports, grants, posts)',
  'Administrative help (scheduling, lists, cleanup)',
] as const;

/**
 * The recommended default purposes for the one-click "accept defaults" fast path (Epic 8
 * minutes-to-value) — the everyday, low-risk uses. Each must be one of PURPOSE_OPTIONS (tested).
 */
export const RECOMMENDED_PURPOSES = [
  'Drafting emails, letters, or communications',
  'Summarizing documents or notes',
  'Administrative help (scheduling, lists, cleanup)',
] as const;

/**
 * Sensible default seed answers for the fast "use recommended answers" path. Deliberately
 * PROTECTIVE (responsible-AI, Val-approved 2026-11-19): the three risk questions default to
 * 'not_sure', which KEEPS every safety rule on (only an explicit 'no' drops one — see
 * includeUnlessNo). The leader still reviews the drafted rules and must click Activate before
 * the policy takes effect (Val, 2026-11-19: keep the review step), and can relax any rule
 * later. The policy is generated
 * deterministically from these answers + the standards library — no model writes it.
 */
export function recommendedSeedAnswers(accountableName: string): PolicySeedAnswers {
  const name = accountableName.trim() || 'Your organization’s lead';
  return {
    accountablePerson: { name, role: 'Accountable Leader' },
    purposes: [...RECOMMENDED_PURPOSES],
    handlesSensitiveData: 'not_sure',
    higherStakes: 'not_sure',
    externalContent: 'not_sure',
  };
}

/** Lower-cased, trimmed, with surrounding quotes/punctuation removed — for matching filler answers. */
function normalizeFreeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[\s"'“”‘’.,;:!-]+|[\s"'“”‘’.,;:!-]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Filler a leader types into the optional "add your own limits" box (Q7) to mean "nothing to add".
 * Kept deliberately short and exact-match, so a real limit is never dropped by accident.
 */
const PLACEHOLDER_ANSWERS = new Set([
  'none',
  'no',
  'n/a',
  'na',
  'nil',
  'nothing',
  'nothing else',
  'not applicable',
  'no limits',
  'no other limits',
  'none for now',
]);

/** True when a Q7 entry is filler ("none", "n/a", …) rather than a real limit. */
export function isPlaceholderAnswer(s: string): boolean {
  const n = normalizeFreeText(s);
  return n === '' || PLACEHOLDER_ANSWERS.has(n);
}

const SELF_REFERENCES = new Set([
  'me',
  'myself',
  'i',
  'self',
  'same',
  'same person',
  'same as above',
]);

/**
 * True when the Q6 reviewer answer means "the person I named first" ("me", "myself", …). Such an
 * answer is replaced by the accountable person's name, so the rule never reads "myself reviews…".
 */
export function isSelfReference(s: string): boolean {
  return SELF_REFERENCES.has(normalizeFreeText(s));
}

const TRISTATES: readonly string[] = ['yes', 'no', 'not_sure'];

function isTriState(v: unknown): v is TriState {
  return typeof v === 'string' && TRISTATES.includes(v);
}

/**
 * Validate + normalize untrusted intake answers at the Service boundary (secure-coding A04).
 * Required: Q1 (name + role), Q2 (>=1 purpose), Q3/Q4 (a valid tri-state). Optional fields,
 * when present, must be well-typed. Optional free text is normalized: filler Q7 limits ("none",
 * "n/a") are dropped and a "me"/"myself" Q6 reviewer falls back to the accountable person.
 * Returns the normalized answers or a plain-language error.
 */
export function validatePolicySeedAnswers(
  input: unknown,
): { ok: true; answers: PolicySeedAnswers } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Your answers could not be read. Please try again.' };
  }
  const a = input as Record<string, unknown>;

  const person = a.accountablePerson as { name?: unknown; role?: unknown } | undefined;
  if (
    !person ||
    typeof person.name !== 'string' ||
    !person.name.trim() ||
    typeof person.role !== 'string' ||
    !person.role.trim()
  ) {
    return { ok: false, error: 'Please name who is accountable for AI use, and their role (Q1).' };
  }

  if (!Array.isArray(a.purposes) || !a.purposes.every((p) => typeof p === 'string')) {
    return { ok: false, error: 'Please pick at least one way you will use AI (Q2).' };
  }
  const purposes = (a.purposes as string[]).map((p) => p.trim()).filter(Boolean);
  if (purposes.length === 0) {
    return { ok: false, error: 'Please pick at least one way you will use AI (Q2).' };
  }

  if (!isTriState(a.handlesSensitiveData)) {
    return { ok: false, error: 'Please answer the sensitive-information question (Q3).' };
  }
  if (!isTriState(a.higherStakes)) {
    return { ok: false, error: 'Please answer the higher-stakes question (Q4).' };
  }
  if (a.externalContent !== undefined && !isTriState(a.externalContent)) {
    return { ok: false, error: 'That answer for sharing AI content (Q5) was not valid.' };
  }
  if (a.reviewer !== undefined && typeof a.reviewer !== 'string') {
    return { ok: false, error: 'That reviewer value (Q6) was not valid.' };
  }
  if (
    a.customProhibitedUses !== undefined &&
    (!Array.isArray(a.customProhibitedUses) ||
      !a.customProhibitedUses.every((s) => typeof s === 'string'))
  ) {
    return { ok: false, error: 'Those custom limits (Q7) were not valid.' };
  }

  return {
    ok: true,
    answers: {
      accountablePerson: { name: person.name.trim(), role: person.role.trim() },
      purposes,
      handlesSensitiveData: a.handlesSensitiveData,
      higherStakes: a.higherStakes,
      externalContent: a.externalContent as TriState | undefined,
      // "me"/"myself" → fall back to the accountable person (the Q6 default) so the rule names them.
      reviewer:
        typeof a.reviewer === 'string' && a.reviewer.trim() && !isSelfReference(a.reviewer)
          ? a.reviewer.trim()
          : undefined,
      // Drop filler like "none" / "n/a" so it never becomes a policy clause.
      customProhibitedUses: (() => {
        const kept = ((a.customProhibitedUses as string[] | undefined) ?? [])
          .map((u) => u.trim())
          .filter((u) => !isPlaceholderAnswer(u));
        return kept.length ? kept : undefined;
      })(),
    },
  };
}
