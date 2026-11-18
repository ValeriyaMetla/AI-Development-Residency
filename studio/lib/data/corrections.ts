import { createClient, getCurrentUser } from '@/lib/data/supabase/server';
import { writeAuditEvent } from '@/lib/data/runs';
import type { CorrectionEntry, CorrectionKind } from '@/lib/domain/corrections';

/**
 * Data-Source helpers for the entry-correction / note flow (Chunk 3, ADR-0003 / ADR-0021).
 *
 * This is the ONE writer Lane B owns, and it is strictly additive: it inserts a new run_correction
 * row ALONGSIDE an immutable run and never edits task_run / task_output / audit_event. Own-runs-only
 * and append-only are enforced at the RLS + privilege level (the migration); this layer fails closed
 * if a write is refused. Org isolation runs under the caller's JWT.
 */

/**
 * The caller's OWN corrections (newest-visible grouping is done in Domain). Because INSERT is
 * own-runs-only, `created_by = me` returns exactly the notes this person has made. Non-sensitive
 * for aggregation, but the note text IS the content the person chose to attach, shown back only to
 * them and their org (same visibility as the run). Returns `null` on failure (error state), `[]`
 * when the person has made none.
 */
export async function getMyCorrections(): Promise<CorrectionEntry[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('run_correction')
    .select('id, task_run_id, kind, note, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('getMyCorrections failed:', error.message);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    taskRunId: row.task_run_id as string,
    kind: row.kind as CorrectionKind,
    note: row.note as string,
    createdAt: row.created_at as string,
  }));
}

/**
 * Record one correction on a run the caller ran (ADR-0021). Two writes, each with one job:
 *   1. the APPEND-ONLY run_correction row — the additive annotation (what/kind/when, + the note);
 *   2. a no-content audit event — the central-trail entry (payload carries only the kind, never the
 *      note text; ADR-6), by CALLING Lane A's writeAuditEvent (call-only, not edited).
 * The run's status is NOT touched — a correction is commentary, not a governance decision. Fails
 * closed: if the row insert errors (e.g. RLS refuses a run the caller did not run), returns false
 * and never claims success. RLS enforces own-runs-only + org scope.
 */
export async function recordCorrection(params: {
  orgId: string;
  taskRunId: string;
  createdBy: string;
  kind: CorrectionKind;
  note: string;
}): Promise<boolean> {
  const supabase = await createClient();

  const { error: insertError } = await supabase.from('run_correction').insert({
    task_run_id: params.taskRunId,
    created_by: params.createdBy,
    kind: params.kind,
    note: params.note,
  });
  if (insertError) {
    console.error('recordCorrection insert failed:', insertError.message);
    return false;
  }

  await writeAuditEvent({
    orgId: params.orgId,
    taskRunId: params.taskRunId,
    actor: params.createdBy,
    eventType: 'task_run_corrected',
    payload: { kind: params.kind }, // the kind is a non-sensitive enum fact — never the note text (ADR-6)
  });

  return true;
}
