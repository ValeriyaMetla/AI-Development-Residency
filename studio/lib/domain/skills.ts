/**
 * Skill registry (Domain layer, ADR-0003). The *behavior* of each governed Skill — the base prompt
 * (policy-grounded at run time via `withPolicyContext`) and its self-critique quality bar — keyed by
 * the DB `skill.key`. Kept OUT of the pipeline (Epic 3 "Build the \"Draft a thank-you\" starter
 * Skill") so adding or tuning a Skill is a change HERE, not an edit to the governed-run spine. The
 * DB `skill` row owns identity (key / name / is_hero); this module owns how the Skill behaves.
 */

export type SkillDef = {
  key: string;
  /** Base system prompt; the pipeline folds the org's active policy into it at run time. */
  basePrompt: string;
  /** Optional per-Skill quality bar for the self-critique Challenger (e.g. tone). */
  critiqueCriteria?: string;
  /**
   * Policy-rule categories relevant to this Skill — used to surface the applicable rules in-context
   * in the runner (Epic 3 "Surface the applicable rule in-context"), filtered so a Doer sees only
   * the rules that bear on this task, not the whole policy. Does NOT affect enforcement: the
   * pipeline always applies the full active policy (inheritance, ADR-0009); this is display-only.
   */
  relevantCategories: string[];
};

export const SKILL_DEFS: Record<string, SkillDef> = {
  draft_thank_you: {
    key: 'draft_thank_you',
    basePrompt:
      'You help a small nonprofit write a short, warm, sincere thank-you note. ' +
      'Keep it to 2-3 sentences. Return only the note text as plain prose — no markdown, ' +
      'asterisks, or other formatting, and no sign-off, signature, or mention of AI.',
    critiqueCriteria:
      'The note must sound warm, sincere, and personal — like a real person thanking a supporter. ' +
      'Flag or revise a draft that is cold, stiff, transactional, generic/form-letter, or ' +
      'over-the-top and insincere. A genuinely warm, specific, human note passes.',
    // Drafting an outbound donor note touches: contact details/PII (data-protection), a person
    // reviewing before sending (human-oversight), and AI-assisted disclosure (transparency-provenance).
    relevantCategories: ['data-protection', 'human-oversight', 'transparency-provenance'],
  },
};

/** The behavior definition for a Skill key, or null if the key is not a known runnable Skill. */
export function getSkillDef(key: string): SkillDef | null {
  return SKILL_DEFS[key] ?? null;
}

/**
 * Filter a set of active-policy rules to those whose category is relevant to this Skill, for the
 * in-context guidance panel. Pure and display-only — never gates a run. Unknown Skill → [].
 */
export function applicableRules<T extends { category: string }>(skillKey: string, rules: T[]): T[] {
  const def = getSkillDef(skillKey);
  if (!def) return [];
  const categories = new Set(def.relevantCategories);
  return rules.filter((rule) => categories.has(rule.category));
}
