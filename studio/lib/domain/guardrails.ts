/**
 * Guardrail rule-checks (Domain layer, ADR-0003 / ADR-27 / D5).
 *
 * Pure, deterministic functions — no I/O, no framework or DB — so they are
 * provably server-side and unit-testable. For Phase 0 this is one baseline check;
 * the real policy-grounded rule-check (against the org's active policy) and the
 * PII / risky-use checks arrive in Phase 1.
 */

export type GuardrailResult = {
  result: 'pass' | 'flag' | 'block';
  reason: string;
};

/** Baseline rule-check: block an empty AI response; otherwise pass. */
export function ruleCheck(output: string): GuardrailResult {
  if (!output.trim()) {
    return { result: 'block', reason: 'The AI returned an empty response.' };
  }
  return { result: 'pass', reason: 'Output passed the baseline rule-check.' };
}
