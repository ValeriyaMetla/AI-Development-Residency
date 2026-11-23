import type { NewPolicyRule, PolicyRule } from '@/lib/data/policy';

/**
 * Policy editing — PURE logic (Domain layer, ADR-0003 / ADR-0024). Validating the untrusted edit
 * payload and assembling the new ruleset. No data access here (type-only import, erased at build),
 * so a client component may safely import a constant like MAX_RULE_TEXT. The data-touching
 * orchestration lives in policy-publish.ts.
 *
 * Editing never mutates the active policy; it ASSEMBLES a new ruleset and the action publishes it
 * as a new version (createPolicy -> insertPolicyRules -> activatePolicy), so a past run's stamped
 * policy still points at the exact rules it was checked against.
 *
 * Baseline-safety rules are LOCKED (ADR-0024): they carry into the new version verbatim and can be
 * neither edited nor retired here — the always-on safety floor. The leader edits / retires / adds
 * only non-baseline rules. All text is untrusted input, validated before any write (secure-coding).
 */

export const MAX_RULE_TEXT = 500;

/** One kept (possibly edited) existing non-baseline rule, by id. Omitting a rule retires it. */
export type RuleEdit = { id: string; ruleText: string };
/**
 * An accepted rule suggestion to add (ADR-0025). Built ONLY on the server from the suggestion
 * catalog + standards — never parsed from client input (parsePolicyEditInput never returns it), so a
 * client cannot mark a rule as `suggested` or supply its citation.
 */
export type SuggestedAddition = {
  suggestionKey: string;
  ruleText: string;
  standardRuleId: string;
  citation: string;
  category: string;
  riskTier: string;
};
export type ParsedPolicyEdit = {
  edits: RuleEdit[];
  additions: string[];
  /** Server-side only: an accepted rule suggestion to add as origin 'suggested'. */
  suggested?: SuggestedAddition;
};

export type ParsePolicyEditResult =
  { ok: true; value: ParsedPolicyEdit } | { ok: false; error: string };

/** Validate the untrusted edit payload into a typed shape (shape only; business rules in assemble). */
export function parsePolicyEditInput(input: unknown): ParsePolicyEditResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid edit.' };
  }
  const { edits, additions } = input as Record<string, unknown>;
  if (!Array.isArray(edits) || !Array.isArray(additions)) {
    return { ok: false, error: 'Invalid edit.' };
  }
  const cleanEdits: RuleEdit[] = [];
  for (const e of edits) {
    if (typeof e !== 'object' || e === null) return { ok: false, error: 'Invalid rule edit.' };
    const { id, ruleText } = e as Record<string, unknown>;
    if (typeof id !== 'string' || id.trim() === '' || typeof ruleText !== 'string') {
      return { ok: false, error: 'Invalid rule edit.' };
    }
    cleanEdits.push({ id, ruleText });
  }
  const cleanAdditions: string[] = [];
  for (const a of additions) {
    if (typeof a !== 'string') return { ok: false, error: 'Invalid added rule.' };
    cleanAdditions.push(a);
  }
  return { ok: true, value: { edits: cleanEdits, additions: cleanAdditions } };
}

/**
 * The rule texts an edit actually changes or adds (ADR-0032 point 2): edited texts that differ from
 * the current rule (ignoring surrounding whitespace), then every addition. Only these are scanned for
 * command-like text on publish, so an existing rule doesn't re-trigger the warning every time.
 */
export function changedRuleTexts(
  current: { id: string; ruleText: string }[],
  input: { edits: RuleEdit[]; additions: string[] },
): string[] {
  const currentText = new Map(current.map((r) => [r.id, r.ruleText.trim()]));
  const edited = input.edits
    .filter((e) => currentText.get(e.id) !== e.ruleText.trim())
    .map((e) => e.ruleText);
  return [...edited, ...input.additions];
}

export type AssembleResult = { ok: true; rules: NewPolicyRule[] } | { ok: false; error: string };

/**
 * Build the new version's full ruleset from the AUTHORITATIVE current rules + the leader's edits.
 * Baseline rules carry forward untouched (locked). A kept edit must name an existing NON-baseline
 * rule; anything not kept is retired. Edited/added text is trimmed, non-empty, length-capped.
 */
export function assembleEditedRules(
  current: PolicyRule[],
  input: ParsedPolicyEdit,
): AssembleResult {
  const baseline = current.filter((r) => r.isBaselineSafety);
  const editableById = new Map(current.filter((r) => !r.isBaselineSafety).map((r) => [r.id, r]));

  const kept: NewPolicyRule[] = [];
  for (const e of input.edits) {
    const orig = editableById.get(e.id);
    if (!orig) {
      // Unknown id, or an attempt to edit a locked baseline rule — reject (tamper-safe).
      return { ok: false, error: 'That rule can’t be edited.' };
    }
    const text = e.ruleText.trim();
    if (text === '') return { ok: false, error: 'A rule can’t be empty.' };
    if (text.length > MAX_RULE_TEXT) {
      return { ok: false, error: `Keep each rule under ${MAX_RULE_TEXT} characters.` };
    }
    kept.push({
      ruleText: text,
      standardRuleId: orig.standardRuleId,
      citation: orig.citation,
      category: orig.category,
      riskTier: orig.riskTier,
      origin: orig.origin,
      isBaselineSafety: false,
      needsReview: false,
      sourceQuestion: orig.sourceQuestion,
      suggestionKey: orig.suggestionKey ?? null, // an accepted suggestion keeps its provenance
    });
  }

  const added: NewPolicyRule[] = [];
  for (const a of input.additions) {
    const text = a.trim();
    if (text === '') continue; // an empty "add a rule" row is ignored, not an error
    if (text.length > MAX_RULE_TEXT) {
      return { ok: false, error: `Keep each rule under ${MAX_RULE_TEXT} characters.` };
    }
    added.push({
      ruleText: text,
      category: 'custom',
      riskTier: 'standard',
      origin: 'custom',
      isBaselineSafety: false,
      needsReview: false,
    });
  }

  // An accepted rule suggestion (server-built, ADR-0025). Its text may be the leader's edit, so it
  // is validated like any other rule; its citation/category come from the catalog, not the client.
  const suggestedRules: NewPolicyRule[] = [];
  if (input.suggested) {
    const sg = input.suggested;
    if (current.some((r) => r.suggestionKey === sg.suggestionKey)) {
      return { ok: false, error: 'That suggestion is already in your rules.' };
    }
    const text = sg.ruleText.trim();
    if (text === '') return { ok: false, error: 'A rule can’t be empty.' };
    if (text.length > MAX_RULE_TEXT) {
      return { ok: false, error: `Keep each rule under ${MAX_RULE_TEXT} characters.` };
    }
    suggestedRules.push({
      ruleText: text,
      standardRuleId: sg.standardRuleId,
      citation: sg.citation,
      category: sg.category,
      riskTier: sg.riskTier,
      origin: 'suggested',
      isBaselineSafety: false,
      needsReview: false,
      suggestionKey: sg.suggestionKey,
    });
  }

  const baselineRules: NewPolicyRule[] = baseline.map((r) => ({
    ruleText: r.ruleText,
    standardRuleId: r.standardRuleId,
    citation: r.citation,
    category: r.category,
    riskTier: r.riskTier,
    origin: r.origin,
    isBaselineSafety: true,
    needsReview: false,
    sourceQuestion: r.sourceQuestion,
  }));

  const rules = [...baselineRules, ...kept, ...added, ...suggestedRules];
  if (rules.length === 0) {
    return { ok: false, error: 'A policy needs at least one rule.' };
  }
  return { ok: true, rules };
}
