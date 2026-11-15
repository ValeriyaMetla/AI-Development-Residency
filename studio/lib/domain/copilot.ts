/**
 * Governance Co-Pilot — transparent risk-tiering engine (Domain layer, ADR-0010 / ADR-0003).
 *
 * PURE, DETERMINISTIC functions — no I/O, no DB, no model call — so the risk tier is provably
 * code, not a black-box verdict (ADR-0010 / Build-Plan ADR-3), and is fully unit-testable
 * (ADR-0027). The LLM (in the pipeline) only explains the result and phrases the safer-way; it
 * never decides the tier or writes a citation.
 *
 * Reference: docs/design/epic-4-copilot-design.md (§3 tiering, §4 safer-way, §5 output, §6 grounding).
 */

// --- Core vocabularies (mirror the DB enums in 20261114010000_copilot_assessment.sql) ---

export type CopilotVerdict = 'use' | 'use_with_conditions' | 'dont' | 'out_of_scope';
export type CopilotTier = 'minimal' | 'limited' | 'high' | 'prohibited' | 'undetermined';

/** The five risk signals the engine reads (design §3.4). */
export type SignalKey =
  'bannedPurpose' | 'judgesPerson' | 'highStakesDomain' | 'sensitiveData' | 'outputLeavesOrg';

/** A signal value: true/false, or 'unknown' (ambiguous / unanswered) — which rounds the tier UP. */
export type SignalValue = boolean | 'unknown';
export type SignalInput = Record<SignalKey, SignalValue>;
export type Signals = Record<SignalKey, boolean>;

type SignalDef = {
  /** Plain-language reason shown when this signal fires. */
  reason: string;
  /** The standard_rule code(s) that ground this signal (citations are resolved by the data layer). */
  citationCodes: string[];
  /** The safer-way mitigation, or null if the signal is irreducible (no safe path). */
  mitigation: string | null;
  /** Whether applying the mitigation NEUTRALIZES the signal (drops it in the re-tier). */
  neutralizes: boolean;
};

/**
 * The signal registry — the single source of truth for what each signal means, how it grounds,
 * and how (if at all) it can be mitigated. Citation codes reference seeded `standard_rule` rows.
 */
export const SIGNAL_DEFS: Record<SignalKey, SignalDef> = {
  bannedPurpose: {
    reason:
      'This looks like a banned purpose (e.g. manipulation, social scoring, surveillance, or anything illegal).',
    citationCodes: ['euaiact-match-risk'],
    mitigation: null, // irreducible
    neutralizes: false,
  },
  judgesPerson: {
    reason: 'This would have AI judge, rank, score, or decide about a specific person.',
    citationCodes: ['euaiact-human-override', 'nist-human-oversight'],
    mitigation:
      'Restructure so the AI only does the work (organizing, drafting) and a person makes the judgment about people.',
    neutralizes: true, // clears only if the judgment is taken off the AI
  },
  highStakesDomain: {
    reason:
      'This is a high-stakes domain (health, legal, financial, housing/benefits, safety, or crisis).',
    citationCodes: ['nist-check-output', 'euaiact-human-override'],
    mitigation: 'Add a mandatory human review and check the output carefully before acting on it.',
    neutralizes: false, // the domain remains; human approval stays a permanent floor
  },
  sensitiveData: {
    reason:
      'This involves sensitive personal data (health, financial, case/service details, or info about vulnerable people).',
    citationCodes: ['iso42001-data-governance'],
    mitigation: 'Strip, minimize, or anonymize the sensitive details before they reach the AI.',
    neutralizes: true,
  },
  outputLeavesOrg: {
    reason:
      'The output leaves the organization (sent to the person served, a funder, or the public).',
    citationCodes: ['euaiact-disclose-ai'],
    mitigation:
      'Have a person review and approve before sending, and keep the AI-assisted provenance label.',
    neutralizes: true,
  },
};

/** Order in which signals are checked; FIRST MATCH wins (design §3.5). */
const TIER_ORDER: { key: SignalKey; tier: CopilotTier }[] = [
  { key: 'bannedPurpose', tier: 'prohibited' },
  { key: 'judgesPerson', tier: 'high' },
  { key: 'highStakesDomain', tier: 'high' },
  { key: 'sensitiveData', tier: 'high' },
  { key: 'outputLeavesOrg', tier: 'limited' },
];

/** Fail-safe: an 'unknown' signal is treated as TRUE (rounds the tier up, never down). */
export function resolveSignals(input: SignalInput): Signals {
  const out = {} as Signals;
  (Object.keys(SIGNAL_DEFS) as SignalKey[]).forEach((k) => {
    out[k] = input[k] === 'unknown' ? true : input[k];
  });
  return out;
}

/** Deterministic tier from signals — first match wins; none → minimal (design §3.5). */
export function tierFromSignals(s: Signals): CopilotTier {
  for (const { key, tier } of TIER_ORDER) {
    if (s[key]) return tier;
  }
  return 'minimal';
}

/** Tier → user-facing verdict (design §5.3). */
export function verdictFromTier(tier: CopilotTier): CopilotVerdict {
  switch (tier) {
    case 'prohibited':
      return 'dont';
    case 'high':
    case 'limited':
      return 'use_with_conditions';
    case 'minimal':
      return 'use';
    case 'undetermined':
      return 'out_of_scope';
  }
}

/** High and Prohibited always require a named human to decide (responsible-AI rule 9). */
export function humanDecisionRequired(tier: CopilotTier): boolean {
  return tier === 'high' || tier === 'prohibited';
}

/** A short, grounded plain-language tier badge (design §5.4). */
export function tierLabel(tier: CopilotTier): string {
  switch (tier) {
    case 'prohibited':
      return 'Prohibited (EU AI Act framework)';
    case 'high':
      return 'High-risk (EU AI Act framework)';
    case 'limited':
      return 'Limited-risk (EU AI Act framework)';
    case 'minimal':
      return 'Minimal-risk';
    case 'undetermined':
      return 'Needs a human to judge';
  }
}

export type Reason = { signalKey: SignalKey; plainText: string; citationCodes: string[] };
export type Mitigation = {
  signalKey: SignalKey;
  plainText: string;
  neutralizes: boolean;
  citationCodes: string[];
};
export type SaferWay = {
  mitigations: Mitigation[];
  projectedTier: CopilotTier;
  projectedVerdict: CopilotVerdict;
  /** True when an irreducible signal remains, so there is no safe path (design §4.6). */
  noSafePath: boolean;
};

/** One reason per FIRED signal, each carrying its grounding codes (design §5.2 / §6). */
export function reasonsFor(s: Signals): Reason[] {
  return (Object.keys(SIGNAL_DEFS) as SignalKey[])
    .filter((k) => s[k])
    .map((k) => ({
      signalKey: k,
      plainText: SIGNAL_DEFS[k].reason,
      citationCodes: SIGNAL_DEFS[k].citationCodes,
    }));
}

/**
 * The safer-way (design §4): the mitigations for fired, mitigable signals, and the PROJECTED tier
 * from re-running the engine with the neutralizable ones cleared. Returns null for a Minimal use
 * (nothing to make safer). `noSafePath` is true when an irreducible signal (banned purpose) remains.
 */
export function saferWay(s: Signals): SaferWay | null {
  const tier = tierFromSignals(s);
  if (tier === 'minimal') return null;

  const firedMitigable = (Object.keys(SIGNAL_DEFS) as SignalKey[]).filter(
    (k) => s[k] && SIGNAL_DEFS[k].mitigation !== null,
  );

  const mitigations: Mitigation[] = firedMitigable.map((k) => ({
    signalKey: k,
    plainText: SIGNAL_DEFS[k].mitigation as string,
    neutralizes: SIGNAL_DEFS[k].neutralizes,
    citationCodes: SIGNAL_DEFS[k].citationCodes,
  }));

  // Re-tier with the neutralizable signals cleared (the what-if projection).
  const neutralized: Signals = { ...s };
  firedMitigable.forEach((k) => {
    if (SIGNAL_DEFS[k].neutralizes) neutralized[k] = false;
  });
  const projectedTier = tierFromSignals(neutralized);

  // An irreducible signal (no mitigation) still firing => no safe path.
  const noSafePath = (Object.keys(SIGNAL_DEFS) as SignalKey[]).some(
    (k) => s[k] && SIGNAL_DEFS[k].mitigation === null,
  );

  return {
    mitigations,
    projectedTier,
    projectedVerdict: noSafePath ? 'dont' : verdictFromTier(projectedTier),
    noSafePath,
  };
}

/** The structured recommendation the engine produces (design §5.2). Citations are resolved from
 *  the codes by the data layer; `summary` + final citation strings + policy grounding are layered on. */
export type Recommendation = {
  verdict: CopilotVerdict;
  tier: CopilotTier;
  tierLabel: string;
  signals: Signals;
  reasons: Reason[];
  saferWay: SaferWay | null;
  humanDecisionRequired: boolean;
};

/** Assemble the full deterministic recommendation from resolved signals. */
export function assess(input: SignalInput): Recommendation {
  const signals = resolveSignals(input);
  const tier = tierFromSignals(signals);
  const safer = saferWay(signals);
  // A high-tier use with no safe path reads as "don't", not "use with conditions".
  const verdict = safer?.noSafePath ? 'dont' : verdictFromTier(tier);
  return {
    verdict,
    tier,
    tierLabel: tierLabel(tier),
    signals,
    reasons: reasonsFor(signals),
    saferWay: safer,
    humanDecisionRequired: humanDecisionRequired(tier),
  };
}
