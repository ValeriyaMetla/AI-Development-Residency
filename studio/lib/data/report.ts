import { createClient, getCurrentUser } from '@/lib/data/supabase/server';
import { getRunSummariesSince } from '@/lib/data/usage';
import { safetyNetSummary, type SafetyNetSummary } from '@/lib/domain/usage';
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

// --- Summary inputs (card "Build one-click responsible-AI summary export") ----------------------

/**
 * The org-wide facts the Governed AI Summary is composed from (`composeSummary`, Domain). Counts and
 * names only — never run content. The org name, generation time and period label are supplied by
 * the caller (the page already holds the profile; the label is Domain wording).
 */
export type SummaryInputs = {
  /** All-time outcome counts, from the same derivation the usage dashboard uses. */
  safety: SafetyNetSummary;
  /** ISO of the org's earliest governed run, or null when there are none. */
  firstActivityAt: string | null;
  /** How many distinct runs a person decided on (approved or rejected) — ADR-0020. */
  humanReviewedCount: number;
  /** The policy in force (name + when it took effect); null → genuinely no active policy. */
  policy: { name: string; activeSince: string } | null;
};

/** The earliest instant — "since the beginning" for an all-time read. */
const ALL_TIME = new Date(0).toISOString();

/**
 * Everything the summary needs, or `null` if ANY part fails to load.
 *
 * All-or-nothing on purpose: this feeds a document a Leader hands to a funder, so a partial failure
 * must never print as a fact. In particular a failed policy read is NOT reported as "no active
 * policy" (the trap `getActivePolicy` has, which returns null for both — same reasoning as
 * ADR-0027 / `f6e92dd`). Org isolation is RLS (ADR-0013): `policy` and `approval` are both
 * org-scoped on select, and one active policy per org is a unique index, so no org id is passed.
 *
 * Scale note (YAGNI): the all-time run read pulls status + timestamp per run. Fine at pilot volume;
 * swap for per-status head counts if an org's run count grows large.
 */
export async function getSummaryInputs(): Promise<SummaryInputs | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [runs, reviews, policy] = await Promise.all([
    getRunSummariesSince(ALL_TIME),
    // Only the run id — never `note` (free text a reviewer typed; ADR-6 "no content").
    supabase.from('approval').select('task_run_id'),
    supabase.from('policy').select('name, created_at').eq('status', 'active').maybeSingle(),
  ]);

  if (runs === null) return null;
  if (reviews.error) {
    console.error('getSummaryInputs (approvals) failed:', reviews.error.message);
    return null;
  }
  if (policy.error) {
    console.error('getSummaryInputs (policy) failed:', policy.error.message);
    return null;
  }

  // Runs come back newest first; the last one is the earliest activity.
  const firstActivityAt = runs.length > 0 ? runs[runs.length - 1].createdAt : null;

  // Distinct runs, so a run with more than one decision row is never double-counted (and the
  // "reviewed" figure can't exceed the number of runs it's a share of).
  const reviewedRuns = new Set(
    (reviews.data ?? []).map((r) => (r as { task_run_id: string }).task_run_id),
  );

  const active = policy.data as { name: string; created_at: string } | null;

  return {
    safety: safetyNetSummary(runs),
    firstActivityAt,
    humanReviewedCount: reviewedRuns.size,
    policy: active ? { name: active.name, activeSince: active.created_at } : null,
  };
}
