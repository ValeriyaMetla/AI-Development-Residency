import { createClient, getCurrentUser } from '@/lib/data/supabase/server';
import {
  detectRunGaps,
  extractDetail,
  isActorMe,
  type AuditRecord,
  type RunForGap,
  type TrailActor,
} from '@/lib/domain/report';

/**
 * Data-Source reader for the audit trail (card "Build the audit trail from registry data", Epic #7).
 *
 * READ-ONLY. It never writes, and never touches the spine writers (`pipeline.ts`, `guardrails.ts`,
 * `runs.ts`, `policy.ts` — Lane A). Org isolation is enforced by RLS (the caller's JWT), so every
 * query here is automatically scoped to the caller's organization (ADR-0013).
 *
 * It selects ONLY the allow-listed, non-sensitive fields the trail may show (card non-goal
 * "No content, ever"; Build Plan ADR-6). It never selects `task_run.input_summary` — the Co-Pilot
 * stores raw input there without PII removal (known residual, owned by a separate Co-Pilot card).
 * The plain-language wording and gap logic live in the Domain layer (`lib/domain/report.ts`).
 */

/** Newest-N page size before "Show older entries" (card US6). */
export const TRAIL_PAGE_SIZE = 50;
/** Hard ceiling on a single read, so "Show older" can never ask for an unbounded result. */
const TRAIL_MAX = 1000;

/** The Skill + policy version a run used (card US1). Present only for run-linked events. */
export type TrailRunContext = {
  /** The Skill's name, or null when it couldn't be resolved (shown by the view as "a task"). */
  skillName: string | null;
  /** The policy version in force: its name + when it took effect; null → baseline safety only. */
  policy: { name: string; effectiveAt: string } | null;
  /** Whether a reviewer edited the output before approval (ADR-0022), for "Edited and approved". */
  edited: boolean;
};

/** One row the `/report` page renders: the Domain record plus its run context. */
export type TrailEntry = AuditRecord & { run: TrailRunContext | null };

/** A page of the audit trail. `gappedRunIds` is an array (serializable across the server boundary). */
export type TrailPage = {
  entries: TrailEntry[];
  total: number;
  gappedRunIds: string[];
};

/** A Supabase embedded relationship can come back as an object or a single-element array. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

type RawTaskRun = {
  status: string;
  skill: { name: string } | { name: string }[] | null;
  policy: { name: string; created_at: string } | { name: string; created_at: string }[] | null;
  task_output: { edited_by: string | null }[] | null;
};

type RawEvent = {
  id: string;
  event_type: string;
  created_at: string;
  actor: string | null;
  task_run_id: string | null;
  payload: Record<string, unknown> | null;
  task_run: RawTaskRun | RawTaskRun[] | null;
};

function runContext(raw: RawTaskRun | null): TrailRunContext | null {
  if (!raw) return null;
  const skill = one(raw.skill);
  const policy = one(raw.policy);
  const outputs = raw.task_output ?? [];
  return {
    skillName: skill?.name ?? null,
    policy: policy ? { name: policy.name, effectiveAt: policy.created_at } : null,
    edited: outputs.some((o) => o.edited_by != null),
  };
}

/**
 * The newest `limit` audit entries for the caller's organization (RLS-scoped), newest first, plus
 * the total count and the set of runs with a detectable record gap (US5). Returns `null` on a read
 * failure so the view can tell an error apart from a genuine "no activity yet" (US4).
 */
export async function getAuditTrail(limit = TRAIL_PAGE_SIZE): Promise<TrailPage | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const take = Math.min(Math.max(1, limit), TRAIL_MAX);

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('audit_event')
    .select(
      // Allow-listed fields ONLY — never input_summary, draft, note text or rule text (ADR-6).
      'id, event_type, created_at, actor, task_run_id, payload, ' +
        'task_run:task_run_id(status, skill:skill_id(name), policy:policy_id(name, created_at), task_output(edited_by))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(0, take - 1);

  if (error) {
    console.error('getAuditTrail failed:', error.message);
    return null;
  }

  // Supabase infers an error type for this embedded select; the projection is validated by the
  // RawEvent shape below and only allow-listed fields are read, so narrow through `unknown`.
  const rows = (data ?? []) as unknown as RawEvent[];
  const entries: TrailEntry[] = rows.map((row) => {
    const rawRun = one(row.task_run);
    const run = runContext(rawRun);
    const actor: TrailActor = isActorMe(row.actor, user.id) ? 'you' : 'other';
    return {
      id: row.id,
      type: row.event_type,
      at: row.created_at,
      actor,
      taskRunId: row.task_run_id,
      detail: extractDetail(row.event_type, row.payload ?? {}, {
        edited: run?.edited ?? false,
        runStatus: rawRun?.status ?? null,
      }),
      run,
    };
  });

  const gappedRunIds = await detectGapsForWindow(supabase, rows);

  return { entries, total: count ?? entries.length, gappedRunIds };
}

/**
 * Accurate gap detection (US5): for the runs shown in this window, ask the DB whether each one has a
 * "finished"/"stopped" entry AT ALL — not just within the window — so a terminal event on an older
 * page never reads as a false gap.
 */
async function detectGapsForWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RawEvent[],
): Promise<string[]> {
  const runs: RunForGap[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.task_run_id || seen.has(row.task_run_id)) continue;
    const status = one(row.task_run)?.status;
    if (!status) continue;
    seen.add(row.task_run_id);
    runs.push({ id: row.task_run_id, status: status as RunForGap['status'] });
  }
  if (runs.length === 0) return [];

  const { data, error } = await supabase
    .from('audit_event')
    .select('task_run_id, event_type')
    .in('task_run_id', [...seen])
    .in('event_type', ['task_completed', 'task_blocked']);

  if (error) {
    // Don't invent gaps on a failed check — report none rather than a false "missing" (US5 spirit).
    console.error('detectGapsForWindow failed:', error.message);
    return [];
  }

  const terminalEvents = (data ?? []).map((e) => ({
    type: (e as { event_type: string }).event_type,
    taskRunId: (e as { task_run_id: string | null }).task_run_id,
  }));
  return [...detectRunGaps(runs, terminalEvents)];
}
