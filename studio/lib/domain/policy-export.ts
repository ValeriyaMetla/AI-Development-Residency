import type { NewPolicyRule, PolicyRule, PolicyRuleOrigin } from '@/lib/data/policy';
import { MAX_RULE_TEXT } from '@/lib/domain/policy-edit';

/**
 * Policy portability — PURE serialize + parse/validate (Domain layer, ADR-0003 / Epic 1 "own your
 * rules"). Export turns the active policy into a documented, portable JSON object (no org id, no
 * internal row ids — so it lands cleanly in a fresh org), preserving each rule's text, category,
 * risk tier, origin, is_baseline_safety, and its snapshotted citation (the provenance). Import
 * validates an UNTRUSTED file (secure-coding) and maps it back to insertable rules; a malformed file
 * is rejected with a clear error and nothing is written. No data access here (type-only import), so a
 * client component may import the constants safely.
 */

/** Bump when the shape changes; import rejects an unknown version rather than guessing. */
export const POLICY_EXPORT_FORMAT = 1;
/** A sane upper bound so a huge/hostile file can't be turned into thousands of rows. */
export const MAX_IMPORT_RULES = 500;

const ORIGINS: readonly PolicyRuleOrigin[] = ['standard', 'baseline', 'custom', 'suggested'];

export type PolicyExportRule = {
  ruleText: string;
  category: string;
  riskTier: string;
  origin: PolicyRuleOrigin;
  isBaselineSafety: boolean;
  citation: string | null;
  suggestionKey: string | null;
  sourceQuestion: string | null;
};

export type PolicyExport = {
  formatVersion: number;
  exportedAt: string;
  policy: { name: string };
  rules: PolicyExportRule[];
};

/** Serialize the active policy + its rules into the portable export shape (no org/row ids). */
export function serializePolicy(policy: { name: string }, rules: PolicyRule[]): PolicyExport {
  return {
    formatVersion: POLICY_EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    policy: { name: policy.name },
    rules: rules.map((r) => ({
      ruleText: r.ruleText,
      category: r.category,
      riskTier: r.riskTier,
      origin: r.origin,
      isBaselineSafety: r.isBaselineSafety,
      citation: r.citation,
      suggestionKey: r.suggestionKey,
      sourceQuestion: r.sourceQuestion,
    })),
  };
}

export type ParsePolicyImport =
  { ok: true; name: string; rules: NewPolicyRule[] } | { ok: false; error: string };

/**
 * Validate an untrusted import (a JSON string or already-parsed object) into a clean policy name +
 * insertable rules. Rejects a wrong/absent format version, a missing name, an empty/oversized or
 * malformed rule list, and any rule with empty/over-long text, a non-string category, or an unknown
 * origin. `standard_rule_id` is dropped (an internal FK that wouldn't resolve in another org) — the
 * snapshotted citation text carries the provenance. is_baseline_safety flags are preserved.
 */
export function parsePolicyImport(raw: unknown): ParsePolicyImport {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'That file isn’t valid JSON.' };
    }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'The file isn’t a policy export.' };
  }
  const obj = data as Record<string, unknown>;

  if (obj.formatVersion !== POLICY_EXPORT_FORMAT) {
    return {
      ok: false,
      error: `Unsupported export version — this app reads version ${POLICY_EXPORT_FORMAT}.`,
    };
  }

  const policy = obj.policy;
  const name =
    typeof policy === 'object' &&
    policy !== null &&
    typeof (policy as { name?: unknown }).name === 'string'
      ? (policy as { name: string }).name.trim()
      : '';
  if (!name) return { ok: false, error: 'The file is missing a policy name.' };

  if (!Array.isArray(obj.rules) || obj.rules.length === 0) {
    return { ok: false, error: 'The file has no rules.' };
  }
  if (obj.rules.length > MAX_IMPORT_RULES) {
    return { ok: false, error: `The file has too many rules (limit ${MAX_IMPORT_RULES}).` };
  }

  const rules: NewPolicyRule[] = [];
  for (const entry of obj.rules) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: 'A rule in the file is malformed.' };
    }
    const r = entry as Record<string, unknown>;
    const ruleText = typeof r.ruleText === 'string' ? r.ruleText.trim() : '';
    if (!ruleText) return { ok: false, error: 'A rule in the file is missing its text.' };
    if (ruleText.length > MAX_RULE_TEXT) {
      return { ok: false, error: `A rule is too long (limit ${MAX_RULE_TEXT} characters).` };
    }
    if (typeof r.category !== 'string' || typeof r.riskTier !== 'string') {
      return { ok: false, error: 'A rule in the file is missing its category or risk tier.' };
    }
    if (!ORIGINS.includes(r.origin as PolicyRuleOrigin)) {
      return { ok: false, error: 'A rule in the file has an unknown origin.' };
    }
    rules.push({
      ruleText,
      category: r.category,
      riskTier: r.riskTier,
      origin: r.origin as PolicyRuleOrigin,
      isBaselineSafety: r.isBaselineSafety === true,
      citation: typeof r.citation === 'string' ? r.citation : null,
      suggestionKey: typeof r.suggestionKey === 'string' ? r.suggestionKey : null,
      sourceQuestion: typeof r.sourceQuestion === 'string' ? r.sourceQuestion : null,
      standardRuleId: null, // internal FK — not portable; citation text carries the provenance
      needsReview: false,
    });
  }

  return { ok: true, name, rules };
}
