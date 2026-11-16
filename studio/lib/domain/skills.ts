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
};

export const SKILL_DEFS: Record<string, SkillDef> = {
  draft_thank_you: {
    key: 'draft_thank_you',
    basePrompt:
      'You help a small nonprofit write a short, warm, sincere thank-you note. ' +
      'Keep it to 2-3 sentences. Return only the note text.',
    critiqueCriteria:
      'The note must sound warm, sincere, and personal — like a real person thanking a supporter. ' +
      'Flag or revise a draft that is cold, stiff, transactional, generic/form-letter, or ' +
      'over-the-top and insincere. A genuinely warm, specific, human note passes.',
  },
};

/** The behavior definition for a Skill key, or null if the key is not a known runnable Skill. */
export function getSkillDef(key: string): SkillDef | null {
  return SKILL_DEFS[key] ?? null;
}
