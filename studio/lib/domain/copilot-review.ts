/**
 * What a reviewer sees for a flagged Co-Pilot assessment (Domain layer, ADR-0003) — card "Show
 * reviewers why a Co-Pilot assessment was flagged".
 *
 * The Co-Pilot stores its full recommendation as JSON in `copilot_assessment.recommendation`
 * (ADR-0010). This module turns that stored JSON into the plain review view, CHECKING ITS SHAPE:
 * it's stored data, so a missing or malformed field returns null ("couldn't load the reasons")
 * rather than crashing the queue or showing half the reasons. Pure: no I/O.
 *
 * Decision (Val, 2026-11-23): a "Don't use AI for this" assessment is NEVER approvable — the only
 * action is "Don't go ahead". `approvable` carries that to the screen; the database enforces it too
 * (follow-up PR + ADR).
 */
import { tierLabel, type CopilotTier, type CopilotVerdict } from '@/lib/domain/copilot';

/** One set of verdict titles for the Co-Pilot form and the review screen, so both say the same. */
export const VERDICT_TITLES: Record<CopilotVerdict, string> = {
  use: 'Go ahead',
  use_with_conditions: 'Use with conditions',
  dont: "Don't use AI for this",
  out_of_scope: 'This needs a person to decide',
};

const VERDICTS = Object.keys(VERDICT_TITLES) as CopilotVerdict[];
const TIERS: CopilotTier[] = ['minimal', 'limited', 'high', 'prohibited', 'undetermined'];

export type CopilotReviewReason = { text: string; sources: string[] };

export type CopilotReview = {
  verdict: CopilotVerdict;
  verdictTitle: string;
  riskLabel: string;
  /** The one-line explanation. Written by AI from the already-decided verdict (ADR-0010). */
  explanation: string | null;
  reasons: CopilotReviewReason[];
  /** null when the assessment had no safer-way section. */
  saferWay: { steps: string[]; noSafePath: boolean } | null;
  /** False for "Don't use AI for this": a banned use can't be approved (Val, 2026-11-23). */
  approvable: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Reasons: each needs plain text; sources are the citation texts that came with it. */
function parseReasons(v: unknown): CopilotReviewReason[] | null {
  if (!Array.isArray(v)) return null;
  const out: CopilotReviewReason[] = [];
  for (const r of v) {
    if (!isRecord(r)) return null;
    const text = nonEmptyString(r.plainText);
    if (!text) return null;
    const citations = Array.isArray(r.citations) ? r.citations : [];
    const sources = citations
      .map((c) => (isRecord(c) ? nonEmptyString(c.text) : null))
      .filter((s): s is string => s !== null);
    out.push({ text, sources });
  }
  return out;
}

function parseSaferWay(v: unknown): CopilotReview['saferWay'] | undefined {
  if (v === null || v === undefined) return null;
  if (!isRecord(v) || !Array.isArray(v.mitigations) || typeof v.noSafePath !== 'boolean')
    return undefined; // malformed
  const steps = v.mitigations
    .map((m) => (isRecord(m) ? nonEmptyString(m.plainText) : null))
    .filter((s): s is string => s !== null);
  return { steps, noSafePath: v.noSafePath };
}

/**
 * The review view for one stored assessment, or null when it can't be shown faithfully (unknown
 * verdict or tier, no reasons, or a malformed field). Null means: show "couldn't load the
 * reasons" and don't allow Approve.
 */
export function toCopilotReview(row: {
  verdict: unknown;
  tier: unknown;
  recommendation: unknown;
}): CopilotReview | null {
  const verdict = VERDICTS.find((v) => v === row.verdict);
  const tier = TIERS.find((t) => t === row.tier);
  if (!verdict || !tier || !isRecord(row.recommendation)) return null;

  const reasons = parseReasons(row.recommendation.reasons);
  // A flagged assessment always fired at least one signal; no reasons = can't review faithfully.
  if (!reasons || reasons.length === 0) return null;

  const saferWay = parseSaferWay(row.recommendation.saferWay);
  if (saferWay === undefined) return null;

  return {
    verdict,
    verdictTitle: VERDICT_TITLES[verdict],
    riskLabel: tierLabel(tier),
    explanation: nonEmptyString(row.recommendation.summary),
    reasons,
    saferWay,
    approvable: verdict !== 'dont',
  };
}
