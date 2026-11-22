/**
 * Human-approval gate — input validation (Domain layer, ADR-0003 / ADR-0020). Pure and
 * framework-free so the rules are unit-testable without a request. The Service action validates
 * the untrusted review payload HERE before any write (secure-coding A03/A04 — never trust a value
 * that came from the client), and the Data-Source layer records the decision.
 *
 * A reviewer approves or rejects, and may edit the draft when approving (ADR-0022). The note is
 * optional, trimmed, length-capped, and never required — a plain reason, never sensitive content.
 *
 * ADR-0028: the DATABASE enforces who can review what (review_task_run). This file mirrors that
 * rule only for display (`canBeReviewed`) and wording (`reviewOutcomeMessage`); it never decides.
 * The note / edit caps below are repeated inside review_task_run — a test keeps the two equal.
 */

export type ReviewDecision = 'approved' | 'rejected';

/** Plain-language note cap — a reason, not an essay; keeps a stray paste out of the record. */
export const MAX_REVIEW_NOTE = 500;

/** Edited-draft cap — generous for a rewritten draft, but bounded against an abusive paste. */
export const MAX_EDITED_OUTPUT = 10000;

export type ParsedReview =
  | {
      ok: true;
      taskRunId: string;
      decision: ReviewDecision;
      note: string | null;
      /** The reviewer's edited draft, or null when they didn't edit (ADR-0022). */
      editedOutput: string | null;
    }
  | { ok: false; error: string };

/**
 * Validate an untrusted review payload into clean, typed values. Rejects a missing/blank run id,
 * any decision that is not exactly 'approved' or 'rejected', a non-string or over-long note, and a
 * non-string / empty / over-long edited draft. An empty or whitespace-only note normalizes to null;
 * an absent edit is null. The caller only sends `editedOutput` when the reviewer actually changed
 * the draft (ADR-0022) — an empty edit is a mistake, not "clear the output", so it is rejected.
 */
export function parseReviewInput(input: unknown): ParsedReview {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid review.' };
  }
  const { taskRunId, decision, note, editedOutput } = input as Record<string, unknown>;

  if (typeof taskRunId !== 'string' || taskRunId.trim() === '') {
    return { ok: false, error: 'No run to review.' };
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    return { ok: false, error: 'Choose approve or reject.' };
  }

  let cleanNote: string | null = null;
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      return { ok: false, error: 'Invalid note.' };
    }
    const trimmed = note.trim();
    if (trimmed.length > MAX_REVIEW_NOTE) {
      return { ok: false, error: `Keep your note under ${MAX_REVIEW_NOTE} characters.` };
    }
    cleanNote = trimmed === '' ? null : trimmed;
  }

  let cleanEdited: string | null = null;
  if (editedOutput !== undefined && editedOutput !== null) {
    if (typeof editedOutput !== 'string') {
      return { ok: false, error: 'Invalid edited draft.' };
    }
    const trimmed = editedOutput.trim();
    if (trimmed === '') {
      return { ok: false, error: 'An edited draft can’t be empty.' };
    }
    if (trimmed.length > MAX_EDITED_OUTPUT) {
      return { ok: false, error: `Keep the draft under ${MAX_EDITED_OUTPUT} characters.` };
    }
    cleanEdited = trimmed;
  }

  return {
    ok: true,
    taskRunId: taskRunId.trim(),
    decision,
    note: cleanNote,
    editedOutput: cleanEdited,
  };
}

// ---------------------------------------------------------------------------------------------
// Review outcomes (ADR-0028). review_task_run returns one of these plain words instead of database
// error text; the Service layer turns a refusal into a message a person can act on.
// ---------------------------------------------------------------------------------------------

export const REVIEW_OUTCOMES = [
  'ok',
  'not_signed_in',
  'invalid',
  'not_found',
  'not_pending',
] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

/** Validate what the database returned. Anything unexpected is null (treated as a failure). */
export function parseReviewOutcome(value: unknown): ReviewOutcome | null {
  return typeof value === 'string' && (REVIEW_OUTCOMES as readonly string[]).includes(value)
    ? (value as ReviewOutcome)
    : null;
}

/**
 * Whether a run can be reviewed — DISPLAY ONLY, so the UI offers approve/reject just on runs the
 * database will accept. Only a flagged, undecided run qualifies; the first decision is final.
 */
export function canBeReviewed(status: string): boolean {
  return status === 'needs_review';
}

/** Plain-language message for a refused review. Never reveals whether another org's run exists. */
export function reviewOutcomeMessage(outcome: Exclude<ReviewOutcome, 'ok'>): string {
  switch (outcome) {
    case 'not_signed_in':
      return 'You must be signed in.';
    case 'invalid':
      return 'Check your note and any edits, then try again.';
    case 'not_found':
      return 'We couldn’t find that run.';
    case 'not_pending':
      return 'This run has already been reviewed, or wasn’t flagged for review.';
  }
}
