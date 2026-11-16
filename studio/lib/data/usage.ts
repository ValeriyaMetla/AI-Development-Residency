import { createClient } from '@/lib/data/supabase/server';

/**
 * Data-Source helpers for the read-side Registry view (Chunk 3, ADR-0003).
 *
 * READ-ONLY. This file never writes task_run / task_output / guardrail_check / audit_event
 * (Lane A owns those writers in runs.ts). Org isolation is enforced by RLS
 * (`task_run_select_org`): every query here runs under the caller's JWT, so a plain
 * count over task_run already returns only the caller's organization's rows.
 *
 * Counts only — the Registry view shows THAT AI was used, never WHAT was said
 * (no input_summary / output / PII leaves this layer; ADR-6 spirit).
 */

/**
 * Total governed runs for the caller's organization.
 *
 * Returns the count, or `null` on failure so the Presentation layer can tell an
 * error apart from a genuine zero (the empty state vs the error state must differ).
 */
export async function countOrgRuns(): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('task_run')
    .select('id', { count: 'exact', head: true });
  if (error) {
    console.error('countOrgRuns failed:', error.message);
    return null;
  }
  return count ?? 0;
}
