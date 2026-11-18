/**
 * Entry-correction / note flow — input validation + display logic (Domain layer, ADR-0003 /
 * ADR-0021). Pure and framework-free so the rules are unit-testable without a request. The Service
 * action validates the untrusted correction payload HERE before any write (secure-coding A03/A04 —
 * never trust a value that came from the client), and the Data-Source layer records it.
 *
 * A correction is additive: it is recorded ALONGSIDE an immutable run, never an edit of it. Two
 * kinds — 'correction' (the record is inaccurate) and 'note' (added context). Unlike an approval
 * note, the text is REQUIRED: a correction with no words says nothing.
 */

export type CorrectionKind = 'correction' | 'note';

/** The allowed kinds, in display order (used by the UI selector and the parser's membership check). */
export const CORRECTION_KINDS: readonly CorrectionKind[] = ['note', 'correction'] as const;

/** Plain-language note cap — a reason, not an essay; keeps a stray paste out of the record. */
export const MAX_CORRECTION_NOTE = 500;

/** Human label for a kind. */
export function kindLabel(kind: CorrectionKind): string {
  return kind === 'correction' ? 'Correction' : 'Note';
}

export type ParsedCorrection =
  | { ok: true; taskRunId: string; kind: CorrectionKind; note: string }
  | { ok: false; error: string };

/**
 * Validate an untrusted correction payload into clean, typed values. Rejects a missing/blank run
 * id, any kind that is not exactly 'correction' or 'note', and a missing, blank, non-string, or
 * over-long note. The note is trimmed and required — there is no "empty correction".
 */
export function parseCorrectionInput(input: unknown): ParsedCorrection {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid correction.' };
  }
  const { taskRunId, kind, note } = input as Record<string, unknown>;

  if (typeof taskRunId !== 'string' || taskRunId.trim() === '') {
    return { ok: false, error: 'No run to annotate.' };
  }
  if (kind !== 'correction' && kind !== 'note') {
    return { ok: false, error: 'Choose a note or a correction.' };
  }
  if (typeof note !== 'string') {
    return { ok: false, error: 'Invalid note.' };
  }
  const trimmed = note.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Add a short note before saving.' };
  }
  if (trimmed.length > MAX_CORRECTION_NOTE) {
    return { ok: false, error: `Keep your note under ${MAX_CORRECTION_NOTE} characters.` };
  }

  return { ok: true, taskRunId: taskRunId.trim(), kind, note: trimmed };
}

/** A recorded correction, reduced to the fields the per-user view renders. */
export type CorrectionEntry = {
  id: string;
  taskRunId: string;
  kind: CorrectionKind;
  note: string;
  createdAt: string;
};

/**
 * Group a flat list of corrections by their run id, preserving the list's order within each run.
 * Pure — the Presentation layer uses it to hang each run's notes off its own row.
 */
export function correctionsByRun(list: readonly CorrectionEntry[]): Map<string, CorrectionEntry[]> {
  const byRun = new Map<string, CorrectionEntry[]>();
  for (const c of list) {
    const existing = byRun.get(c.taskRunId);
    if (existing) existing.push(c);
    else byRun.set(c.taskRunId, [c]);
  }
  return byRun;
}
