/**
 * Risky-use flagging (Domain layer, ADR-0003 / Epic 5). PURE, DETERMINISTIC — code OUTSIDE the model
 * (ADR-16), fully unit-testable (ADR-0027). Scans the task's INTENT (the user's input) for patterns
 * that warrant extra human scrutiny — a decision about a specific person, or a high-stakes domain —
 * and flags the run for the human-approval gate (Wave 3) with a plain-language reason.
 *
 * Deliberately HIGH-PRECISION (the "Tune flagging to keep false-positives low" card): each pattern
 * needs specific wording, so routine, safe tasks (e.g. a donor thank-you) are not flagged — people
 * must trust the flag, so it must not cry wolf.
 */

import type { GuardrailResult } from '@/lib/domain/guardrails';

export type RiskFinding = { id: string; reason: string };

// Phrase-based and conservative so routine tasks don't trip them (e.g. "promote our fundraiser",
// "fire drill", "rate our new logo" must NOT flag) — the "Tune flagging" card's whole point.
const RISK_PATTERNS: { id: string; re: RegExp; reason: string }[] = [
  {
    id: 'decision-about-person',
    re: /\b(whether to (hire|fire|admit|reject|accept|deny|promote|expel)|who (should|gets|deserves|qualifies|to hire|to fire)|(hiring|firing|admission|eligibility|disciplinary) decision)\b/i,
    reason:
      'This looks like a decision about a specific person (e.g. hiring, admitting, or selecting).',
  },
  {
    id: 'ranking-people',
    re: /\b(rank|score|rate|grade)\b[^.?!]{0,30}\b(candidates?|applicants?|students?|employees?|staff|volunteers?|clients?|people)\b/i,
    reason: 'This looks like ranking or scoring specific people.',
  },
  {
    id: 'medical',
    re: /\b(diagnos\w+|prescrib\w+|medical advice|treatment for)\b/i,
    reason: 'This touches medical or health territory, which is high-stakes.',
  },
  {
    id: 'legal',
    re: /\b(legal advice|file a lawsuit|\bsue\b|contract terms)\b/i,
    reason: 'This touches legal territory, which is high-stakes.',
  },
  {
    id: 'benefits-housing',
    re: /\b(evict\w+|benefits? eligibility|immigration status)\b/i,
    reason: 'This touches housing or benefits decisions, which are high-stakes.',
  },
  {
    id: 'safety-crisis',
    re: /\b(suicid\w+|self[\s-]?harm|overdose)\b/i,
    reason: 'This touches a safety or crisis situation, which needs a person.',
  },
];

/** All risk patterns matched in the input (empty when none). */
export function detectRiskyUse(text: string): RiskFinding[] {
  return RISK_PATTERNS.filter((p) => p.re.test(text)).map((p) => ({ id: p.id, reason: p.reason }));
}

/**
 * Risky-use guardrail finding: `flag` (route to human approval) when a risk pattern matches, else
 * `pass`. A flag never blocks — a person reviews it at the approval gate.
 */
export function riskyUseFinding(text: string): GuardrailResult {
  const findings = detectRiskyUse(text);
  if (findings.length === 0) {
    return { result: 'pass', reason: 'No risky-use pattern detected.' };
  }
  return {
    result: 'flag',
    reason: `${findings.map((f) => f.reason).join(' ')} A person should review this before it is used.`,
  };
}
