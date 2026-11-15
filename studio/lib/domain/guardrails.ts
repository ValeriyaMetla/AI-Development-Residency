/**
 * Guardrail rule-check (Domain layer, ADR-0003 / ADR-0014 / ADR-27).
 *
 * PURE, DETERMINISTIC functions — no I/O, no framework, no model call — so the guardrail is code
 * OUTSIDE the model (ADR-16): prompt injection can't disable it, and it is fully unit-testable
 * (ADR-0027). The check runs a small registry of category-keyed checks against the output and the
 * org's ACTIVE policy rules, and returns the most severe finding (block > flag > pass).
 *
 * Scope (ADR-0014): this catches the deterministically checkable violations; plain-language-only
 * rules are enforced at draft time (policy-context prompt-folding). A `pass` means "no deterministic
 * violation", not "fully policy-compliant". Full PII detection / strip-minimize is Release 1b.
 */

export type GuardrailResult = {
  result: 'pass' | 'flag' | 'block';
  reason: string;
};

/** The shape the rule-check needs from an active policy rule (subset of data/policy.ts PolicyRule). */
export type PolicyRuleLike = { ruleText: string; category: string };

/** A single deterministic check: returns a finding (block/flag) or null when nothing is wrong. */
type PolicyCheck = (output: string, rules: PolicyRuleLike[]) => GuardrailResult | null;

// --- individual checks -----------------------------------------------------

/** Safety baseline: an empty AI response is never acceptable. */
function emptyOutputCheck(output: string): GuardrailResult | null {
  if (!output.trim()) {
    return { result: 'block', reason: 'The AI returned an empty response.' };
  }
  return null;
}

// High-precision patterns — a plain email, or a separated phone number — to keep false-positives low.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/;

/**
 * When the active policy includes a data-protection rule, FLAG (never block) output that contains a
 * contact detail, so the leader reviews before sharing. A flag keeps routine outputs unblocked
 * (Epic #5 low-false-positives); full PII handling is 1b.
 */
function contactDetailCheck(output: string, rules: PolicyRuleLike[]): GuardrailResult | null {
  const hasDataProtectionRule = rules.some((r) => r.category === 'data-protection');
  if (!hasDataProtectionRule) return null;
  if (EMAIL_RE.test(output) || PHONE_RE.test(output)) {
    return {
      result: 'flag',
      reason:
        'This output includes a contact detail (an email or phone number). Your policy asks to ' +
        'minimize personal information — please review before sharing.',
    };
  }
  return null;
}

/** The registry — new deterministic checks plug in here without touching the pipeline. */
const CHECKS: PolicyCheck[] = [emptyOutputCheck, contactDetailCheck];

/**
 * Run the deterministic policy rule-check over an output and the org's active policy rules.
 * Returns the most severe finding: block > flag > pass (ADR-0014).
 */
export function ruleCheck(output: string, rules: PolicyRuleLike[] = []): GuardrailResult {
  const findings = CHECKS.map((check) => check(output, rules)).filter(
    (r): r is GuardrailResult => r !== null,
  );
  const blocked = findings.find((f) => f.result === 'block');
  if (blocked) return blocked;
  const flagged = findings.find((f) => f.result === 'flag');
  if (flagged) return flagged;
  return { result: 'pass', reason: 'Output passed the policy rule-check.' };
}
