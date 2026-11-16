import { createClient, getCurrentUser } from '@/lib/data/supabase/server';

/**
 * Data-Source helpers for the read-side Registry view (Chunk 3, ADR-0003).
 *
 * READ-ONLY. This file never writes task_run / task_output / guardrail_check / audit_event
 * (Lane A owns those writers in runs.ts). Org isolation is enforced by RLS
 * (`task_run_select_org`): every query here runs under the caller's JWT, so results are
 * scoped to the caller's organization automatically.
 *
 * Counts and non-sensitive metadata only — the Registry view shows THAT AI was used, never
 * WHAT was said. No input_summary / output / PII leaves this layer (ADR-6 spirit).
 */

export type TaskStatus =
  'running' | 'blocked' | 'needs_review' | 'approved' | 'rejected' | 'completed';

/** A single run reduced to the non-sensitive fields the dashboard aggregates. */
export type RunSummary = {
  status: TaskStatus;
  createdAt: string;
  skillName: string;
};

/**
 * Total governed runs for the caller's organization (all time).
 * Returns the count, or `null` on failure so Presentation can tell an error apart from a
 * genuine zero (the empty state vs the error state must differ).
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

/**
 * Non-sensitive summaries of the org's runs created at/after `sinceIso`, newest first.
 * Pulls only status, timestamp, and the Skill's name (via the skill_id FK) — never any
 * run input or output. Windowed rather than unbounded so the read scales as activity grows.
 * Returns `null` on failure.
 */
export async function getRunSummariesSince(sinceIso: string): Promise<RunSummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_run')
    .select('status, created_at, skill:skill_id(name)')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getRunSummariesSince failed:', error.message);
    return null;
  }
  return (data ?? []).map((row) => {
    const rel = (row as { skill?: { name?: string } | { name?: string }[] }).skill;
    const skill = Array.isArray(rel) ? rel[0] : rel;
    return {
      status: (row as { status: TaskStatus }).status,
      createdAt: (row as { created_at: string }).created_at,
      skillName: skill?.name ?? 'Unknown task',
    };
  });
}

/** One of the caller's own runs, as shown in the per-user "my entries" view. */
export type MyRunEntry = {
  id: string;
  status: TaskStatus;
  createdAt: string;
  skillName: string;
};

/**
 * The caller's OWN runs, newest first (for the "my entries" transparency view).
 *
 * Filtered to `run_by = me` in the query: RLS is org-scoped (not role-split), so this narrows
 * org-readable rows down to the signed-in user's own. Non-sensitive fields only — status, time,
 * and the Skill's name; never any run input or output. Returns `null` on failure (including when
 * there is no signed-in user).
 */
export async function getMyRunEntries(limit = 50): Promise<MyRunEntry[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_run')
    .select('id, status, created_at, skill:skill_id(name)')
    .eq('run_by', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getMyRunEntries failed:', error.message);
    return null;
  }
  return (data ?? []).map((row) => {
    const rel = (row as { skill?: { name?: string } | { name?: string }[] }).skill;
    const skill = Array.isArray(rel) ? rel[0] : rel;
    return {
      id: (row as { id: string }).id,
      status: (row as { status: TaskStatus }).status,
      createdAt: (row as { created_at: string }).created_at,
      skillName: skill?.name ?? 'Unknown task',
    };
  });
}
