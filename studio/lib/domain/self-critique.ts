/**
 * Self-critique "Challenger" pass (Domain layer, ADR-0003 / ADR-0015).
 *
 * PURE, I/O-free functions — no DB, no model call. The model call itself goes through the
 * Data-Source layer (`draftWithClaude`), invoked by the pipeline; this module only (a) builds the
 * critique prompt, (b) parses the model's structured verdict defensively, and (c) maps that verdict
 * to a guardrail-style finding. Keeping it pure makes the prompt-building and (the risky part)
 * response-parsing fully unit-testable without the SDK (ADR-0027).
 *
 * The self-critique is MODEL-BASED and is NEVER the only guardrail: the deterministic rule-check
 * (`guardrails.ts`, code outside the model) runs afterward as the backstop, and the two findings are
 * combined most-severe-wins (ADR-0014 / ADR-0015). A model error or an unparseable response FAILS
 * CLOSED to human review (ADR-0014 resilience), never silently passes.
 */

import type { GuardrailResult } from '@/lib/domain/guardrails';

export type CritiqueVerdict = 'pass' | 'revise' | 'block';

/** The parsed, normalized result of the Challenger pass. */
export type CritiqueResult = {
  verdict: CritiqueVerdict;
  /** One plain-language sentence explaining the verdict (no sensitive payload). */
  reason: string;
  /** The corrected draft — present ONLY when verdict is `revise` and the model supplied one. */
  revisedText: string | null;
};

/** Shown (and logged) when the self-check cannot complete — the run goes to human review. */
export const CRITIQUE_UNAVAILABLE_REASON =
  'The safety self-check could not complete, so this needs a person to review before it is used.';

const PASS_REASON = 'The self-check found no issues with this draft.';

/**
 * Build the Challenger system prompt. The draft under review is passed as the user turn by the
 * caller; this prompt sets the reviewer role, the task intent, the org policy to check against, and
 * the strict JSON response contract.
 */
export function buildCritiquePrompt(
  skillIntent: string,
  policyRules: { ruleText: string }[] = [],
  qualityCriteria?: string,
): string {
  const policyBlock =
    policyRules.length > 0
      ? `\n\nThe organization's AI policy requires:\n${policyRules
          .map((r) => `- ${r.ruleText}`)
          .join('\n')}`
      : '';

  // Optional per-Skill quality bar (e.g. tone for the thank-you Skill). Folded in only when the
  // Skill defines one, so the generic critique is unchanged for Skills that don't (ADR-0015).
  const qualityBlock = qualityCriteria
    ? `\n\nQuality bar for this task — treat a draft that clearly misses it as "revise", but let a ` +
      `reasonable one pass without nit-picking:\n${qualityCriteria}`
    : '';

  return (
    'You are a strict reviewer (a "Challenger") checking a draft written by an AI assistant for a ' +
    'small nonprofit, BEFORE any person sees it. The draft was produced for this task: ' +
    `"${skillIntent}".${policyBlock}${qualityBlock}\n\n` +
    'Review the draft for: factual errors or unsupported claims; unsafe, harmful, discriminatory, ' +
    'or otherwise inappropriate content; anything that violates the policy above; and whether it ' +
    'meets the quality bar above (if one is given). ' +
    'Be conservative about "pass" — but do not invent problems in a clean, ordinary draft.\n\n' +
    'Respond with ONLY a single JSON object, no prose and no code fences, in exactly this shape:\n' +
    '{"verdict":"pass"|"revise"|"block","reason":"<one plain-language sentence>","revised":"<text>"}\n' +
    '- "pass": the draft is fine as written (omit "revised" or leave it empty).\n' +
    '- "revise": the draft has a fixable problem; put a corrected draft in "revised" that keeps the ' +
    'original intent and fixes only what is wrong.\n' +
    '- "block": the draft has a serious safety problem that cannot be safely fixed; do not supply ' +
    '"revised".\n' +
    'Return only the JSON object.'
  );
}

/**
 * Parse the model's response into a normalized CritiqueResult. Defensive by design: strips code
 * fences, extracts the first JSON object, validates the verdict, and normalizes `revised`. Returns
 * `null` when the response cannot be understood — the caller then FAILS CLOSED (ADR-0015).
 */
export function parseCritique(modelText: string): CritiqueResult | null {
  const json = extractJsonObject(modelText);
  if (!json) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const verdict = obj.verdict;
  if (verdict !== 'pass' && verdict !== 'revise' && verdict !== 'block') return null;

  const reasonText = typeof obj.reason === 'string' ? obj.reason.trim() : '';
  const revisedRaw = typeof obj.revised === 'string' ? obj.revised.trim() : '';

  return {
    verdict,
    reason: reasonText || defaultReason(verdict),
    revisedText: verdict === 'revise' && revisedRaw ? revisedRaw : null,
  };
}

/** Map a parsed critique verdict to a guardrail finding (precedence handled in guardrails.ts). */
export function critiqueToFinding(critique: CritiqueResult): GuardrailResult {
  switch (critique.verdict) {
    case 'pass':
      return { result: 'pass', reason: critique.reason };
    case 'revise':
      // The issue was caught (and, when possible, fixed) — surface it so nothing reaches the user
      // unflagged (acceptance criterion), without hard-blocking a fixable draft.
      return { result: 'flag', reason: critique.reason };
    case 'block':
      return { result: 'block', reason: critique.reason };
  }
}

/** The fail-closed finding used when the model call fails or its response can't be parsed. */
export function critiqueUnavailableFinding(): GuardrailResult {
  return { result: 'flag', reason: CRITIQUE_UNAVAILABLE_REASON };
}

/** A short, non-sensitive summary of the critique to store on the task output / audit. */
export function critiqueSummary(critique: CritiqueResult | null): string {
  if (!critique) return `unavailable: ${CRITIQUE_UNAVAILABLE_REASON}`;
  return `${critique.verdict}: ${critique.reason}`;
}

// --- helpers ---------------------------------------------------------------

function defaultReason(verdict: CritiqueVerdict): string {
  switch (verdict) {
    case 'pass':
      return PASS_REASON;
    case 'revise':
      return 'The self-check found a fixable issue and revised the draft.';
    case 'block':
      return 'The self-check found a serious safety issue and stopped the draft.';
  }
}

/** Pull the first balanced-looking JSON object out of a model response (tolerates fences/prose). */
function extractJsonObject(text: string): string | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
