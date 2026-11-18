/**
 * Provenance composition (Domain layer, ADR-0003 / ADR-0022). ONE source of truth for how a run's
 * output is labelled, derived from the run's state — not stored as prose on each row. Every stored
 * task_output row keeps the plain AI base label; the human-involvement layer is composed here from
 * (approved, edited), so the runner, the approvals screen, and Lane C's responsible-AI export all
 * read the same honest label from the same facts.
 */

/** The base label every AI draft carries when stored (the model that produced it). */
export const AI_PROVENANCE = 'AI-generated with Claude (Sonnet)';

/**
 * The honest provenance for a run's current output. Editing only happens on approval (ADR-0022), so
 * `edited` implies a person both changed and accepted it; `approved` without an edit means a person
 * reviewed the AI draft as-is; neither means it is still the unreviewed AI draft.
 */
export function composeProvenance(opts: { approved: boolean; edited: boolean }): string {
  if (opts.edited) return `${AI_PROVENANCE} — edited and approved by a person`;
  if (opts.approved) return `${AI_PROVENANCE} — reviewed by a person`;
  return AI_PROVENANCE;
}
