/**
 * PII detection (Domain layer, ADR-0003 / Epic 5). PURE, DETERMINISTIC, I/O-free functions — code
 * OUTSIDE the model (ADR-16), so prompt injection can't disable it and it is fully unit-testable
 * (ADR-0027). Runs on the user's INPUT *before* the model call (the governed-run pipeline), so
 * sensitive data is caught before it can reach Claude.
 *
 * High-precision detectors only, to keep false-positives low (the "Tune flagging" / "Verify clean
 * input passes" cards): a separated email/phone, a dash-formatted US SSN, and a 13–19 digit sequence
 * that passes the Luhn check (a real card number, not any long number). Free-text street addresses
 * are intentionally NOT matched here — they are too noisy to detect precisely and would nag on
 * ordinary input; they can get a dedicated detector later.
 *
 * Detection records WHAT category was found and HOW MANY — never the raw value (ADR-6): the audit
 * and guardrail records carry categories/counts, not the sensitive text itself.
 */

export type PiiCategory = 'email' | 'phone' | 'us_ssn' | 'credit_card';

export type PiiFinding = { category: PiiCategory; label: string; count: number };

const PATTERN_DETECTORS: { category: PiiCategory; label: string; re: RegExp }[] = [
  {
    category: 'email',
    label: 'email address',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    category: 'phone',
    label: 'phone number',
    re: /(?:\(\d{3}\)\s*|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/g,
  },
  { category: 'us_ssn', label: 'Social Security number', re: /\b\d{3}-\d{2}-\d{4}\b/g },
];

/** Luhn checksum — keeps the card detector precise (a random 16-digit string won't match). */
function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Count Luhn-valid 13–19 digit sequences (allowing spaces/dashes between digits). */
function countCreditCards(text: string): number {
  const candidates = text.match(/\b(?:\d[ -]?){13,19}\b/g) ?? [];
  let count = 0;
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (luhnValid(digits)) count++;
  }
  return count;
}

/** Detect PII categories present in `text`. Returns one finding per category found (count > 0). */
export function detectPii(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const detector of PATTERN_DETECTORS) {
    const matches = text.match(detector.re);
    if (matches && matches.length > 0) {
      findings.push({ category: detector.category, label: detector.label, count: matches.length });
    }
  }
  const cards = countCreditCards(text);
  if (cards > 0) findings.push({ category: 'credit_card', label: 'card number', count: cards });
  return findings;
}

export function hasPii(text: string): boolean {
  return detectPii(text).length > 0;
}

/** A plain-language, non-sensitive summary of findings (categories only, never the raw value). */
export function piiSummary(findings: PiiFinding[]): string {
  if (findings.length === 0) return 'No personal information detected.';
  const parts = findings.map((f) =>
    f.count > 1 ? `${f.count} ${f.label}s` : `${/^[aeiou]/i.test(f.label) ? 'an' : 'a'} ${f.label}`,
  );
  return `Detected personal information in your input: ${parts.join(', ')}.`;
}

/** Placeholder each category is redacted to — preserves enough meaning for the Skill to work. */
const PLACEHOLDER: Record<PiiCategory, string> = {
  email: '[email removed]',
  phone: '[phone number removed]',
  us_ssn: '[SSN removed]',
  credit_card: '[card number removed]',
};

/**
 * Redact detected PII to placeholders (Epic 5 "Strip / minimize by default"). Pure and deterministic.
 * Secure-by-default: the pipeline sends the REDACTED text to the model, so the raw value never leaves
 * the server. Categories in `keep` are DELIBERATELY left in place (the "Allow deliberate keep" card) —
 * an explicit human choice the pipeline logs. Returns the redacted text and all detected findings.
 */
export function redactPii(
  text: string,
  keep: PiiCategory[] = [],
): { redacted: string; findings: PiiFinding[] } {
  const findings = detectPii(text);
  const keptSet = new Set(keep);
  let redacted = text;
  // Pattern categories first (email / phone / SSN are disjoint), then Luhn-valid card numbers.
  for (const detector of PATTERN_DETECTORS) {
    if (keptSet.has(detector.category)) continue;
    redacted = redacted.replace(detector.re, PLACEHOLDER[detector.category]);
  }
  if (!keptSet.has('credit_card')) {
    redacted = redacted.replace(/\b(?:\d[ -]?){13,19}\b/g, (match) =>
      luhnValid(match.replace(/\D/g, '')) ? PLACEHOLDER.credit_card : match,
    );
  }
  return { redacted, findings };
}
