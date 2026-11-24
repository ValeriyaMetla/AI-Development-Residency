import { createClient } from '@/lib/data/supabase/server';
import { parseReviewOutcome, type ReviewOutcome } from '@/lib/domain/approvals';
import { toCopilotReview, type CopilotReview } from '@/lib/domain/copilot-review';
import type { PendingReviewsSummary } from '@/lib/domain/review-waiting';

/** The Co-Pilot's skill key (seeded in `20261114010000_copilot_assessment.sql`). */
const COPILOT_SKILL_KEY = 'governance_copilot';

/**
 * Data-Source helpers for the governed-run pipeline (ADR-0003). All Supabase access
 * for runs lives here; the Domain layer calls these, never the client directly.
 * Everything runs under the user's JWT, so the Step 5 RLS policies apply.
 */

type TaskStatus = 'running' | 'blocked' | 'needs_review' | 'approved' | 'rejected' | 'completed';

type CheckType = 'rule_check' | 'pii' | 'risky_use' | 'self_critique';
type CheckResult = 'pass' | 'flag' | 'block';

export async function getMyOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profile').select('org_id').maybeSingle();
  if (error) {
    console.error('getMyOrgId failed:', error.message);
    return null;
  }
  return data?.org_id ?? null;
}

export type RunnableSkill = { id: string; key: string; name: string; isHero: boolean };

/**
 * List the org's runnable Skills (type 'skill', not the Co-Pilot) for the Skill runner. Skills are a
 * global catalog; RLS allows authenticated reads. Hero Skills first. Returns [] on error (graceful).
 */
export async function listRunnableSkills(): Promise<RunnableSkill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill')
    .select('id, key, name, is_hero')
    .eq('type', 'skill')
    .order('is_hero', { ascending: false })
    .order('name', { ascending: true });
  if (error) {
    console.error('listRunnableSkills failed:', error.message);
    return [];
  }
  return (data ?? []).map((s) => ({ id: s.id, key: s.key, name: s.name, isHero: s.is_hero }));
}

export async function getSkillByKey(key: string): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill')
    .select('id, name')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error('getSkillByKey failed:', error.message);
    return null;
  }
  return data ?? null;
}

export async function createTaskRun(params: {
  orgId: string;
  skillId: string;
  runBy: string;
  inputSummary: string;
  policyId?: string | null;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_run')
    .insert({
      org_id: params.orgId,
      skill_id: params.skillId,
      run_by: params.runBy,
      status: 'running',
      input_summary: params.inputSummary,
      policy_id: params.policyId ?? null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('createTaskRun failed:', error.message);
    return null;
  }
  return data.id;
}

export async function updateTaskRunStatus(taskRunId: string, status: TaskStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('task_run')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskRunId);
  if (error) console.error('updateTaskRunStatus failed:', error.message);
}

export async function saveTaskOutput(params: {
  taskRunId: string;
  content: string;
  provenanceLabel: string;
  selfCritiqueResult: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('task_output').insert({
    task_run_id: params.taskRunId,
    content: params.content,
    provenance_label: params.provenanceLabel,
    self_critique_result: params.selfCritiqueResult,
  });
  if (error) console.error('saveTaskOutput failed:', error.message);
}

export async function saveGuardrailCheck(params: {
  taskRunId: string;
  checkType: CheckType;
  result: CheckResult;
  reasonPlain: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('guardrail_check').insert({
    task_run_id: params.taskRunId,
    check_type: params.checkType,
    result: params.result,
    reason_plain: params.reasonPlain,
  });
  if (error) console.error('saveGuardrailCheck failed:', error.message);
}

export async function writeAuditEvent(params: {
  orgId: string;
  taskRunId: string | null;
  actor: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  // payload holds NO sensitive content (ADR-6) — only non-sensitive event facts.
  const { error } = await supabase.from('audit_event').insert({
    org_id: params.orgId,
    task_run_id: params.taskRunId,
    actor: params.actor,
    event_type: params.eventType,
    payload: params.payload ?? {},
  });
  if (error) console.error('writeAuditEvent failed:', error.message);
}

// ---------------------------------------------------------------------------
// Human-approval gate (Chunk 2 Wave 3, ADR-0020). The spine routes flagged runs to
// 'needs_review'; these two accessors are the consumer — list what's waiting, and record a
// reviewer's approve/reject decision. RLS scopes every row to the caller's org.
// ---------------------------------------------------------------------------

/** One flagged guardrail reason behind a pending run, in plain language (no sensitive payload). */
export type PendingReviewFlag = { checkType: CheckType; reason: string };

/** A run awaiting human review, with just enough to decide (ADR-0020): the draft + why it flagged. */
export type PendingReview = {
  taskRunId: string;
  skillName: string;
  inputSummary: string | null;
  createdAt: string;
  output: string | null;
  provenanceLabel: string | null;
  flags: PendingReviewFlag[];
  /**
   * Present only for Co-Pilot runs (card "Show reviewers why a Co-Pilot assessment was
   * flagged"): the stored advice as a review view, or null when it can't be shown faithfully
   * (missing or malformed) — the screen then says so and doesn't allow Approve.
   */
  copilot?: CopilotReview | null;
};

type PendingReviewRow = {
  id: string;
  input_summary: string | null;
  created_at: string;
  skill: { name: string; key: string } | { name: string; key: string }[] | null;
  copilot_assessment:
    | { verdict: unknown; tier: unknown; recommendation: unknown }
    | { verdict: unknown; tier: unknown; recommendation: unknown }[]
    | null;
  task_output:
    | { content: string | null; provenance_label: string | null }
    | { content: string | null; provenance_label: string | null }[]
    | null;
  guardrail_check: { check_type: CheckType; result: CheckResult; reason_plain: string | null }[];
};

function firstOf<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * The review queue: the org's runs sitting at 'needs_review', oldest first, each joined to its
 * draft output and the guardrail checks that flagged it. RLS limits this to the caller's org.
 * Returns null on a query error (the page shows an error state), [] when nothing is pending.
 */
export async function listPendingReviews(): Promise<PendingReview[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_run')
    .select(
      'id, input_summary, created_at, ' +
        'skill:skill_id ( name, key ), ' +
        'copilot_assessment ( verdict, tier, recommendation ), ' +
        'task_output ( content, provenance_label ), ' +
        'guardrail_check ( check_type, result, reason_plain )',
    )
    .eq('status', 'needs_review')
    // Oldest first, so what has waited longest is seen first (card "Tell leaders when something
    // is waiting for their review").
    .order('created_at', { ascending: true });
  if (error) {
    console.error('listPendingReviews failed:', error.message);
    return null;
  }
  return ((data ?? []) as unknown as PendingReviewRow[]).map((row) => {
    const output = firstOf(row.task_output);
    const skill = firstOf(row.skill);
    const flags = (row.guardrail_check ?? [])
      .filter((c) => c.result === 'flag' || c.result === 'block')
      .map((c) => ({ checkType: c.check_type, reason: c.reason_plain ?? '' }));
    return {
      taskRunId: row.id,
      skillName: skill?.name ?? 'Skill',
      inputSummary: row.input_summary,
      createdAt: row.created_at,
      output: output?.content ?? null,
      provenanceLabel: output?.provenance_label ?? null,
      flags,
      ...(skill?.key === COPILOT_SKILL_KEY
        ? {
            copilot: (() => {
              const assessment = firstOf(row.copilot_assessment);
              return assessment ? toCopilotReview(assessment) : null;
            })(),
          }
        : {}),
    };
  });
}

/**
 * How many of the org's runs are waiting for review, and when the oldest was flagged — for the
 * count on Home and in the menu (card "Tell leaders when something is waiting for their review").
 * One count query under the existing org-scoped read rule (RLS). Returns null on any error: the
 * count is then simply not shown, and a failed count never breaks a page.
 */
export async function countPendingReviews(): Promise<PendingReviewsSummary | null> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('task_run')
    .select('created_at', { count: 'exact' })
    .eq('status', 'needs_review')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error || count === null) {
    if (error) console.error('countPendingReviews failed:', error.message);
    return null;
  }
  const oldest = (data as { created_at: string }[] | null)?.[0]?.created_at ?? null;
  return { count, oldestCreatedAt: oldest };
}

/**
 * Record a reviewer's decision on a flagged run — ONE call to the protected database step
 * review_task_run (ADR-0028). In a single transaction it checks the run is in the caller's org and
 * still needs_review, then writes the optional reviewer edit as a new output version (ADR-0022),
 * the append-only approval row (ADR-0020), the status flip and the audit event. The reviewer is
 * always the signed-in user (auth.uid() inside the function), so no "decided by" is passed in.
 *
 * Returns the database's plain outcome ('ok', 'not_pending', …), or null if the call itself failed
 * or returned something unexpected — the caller treats null as "try again".
 */
export async function recordApproval(params: {
  taskRunId: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  /** The reviewer's edited draft (approve-only). Saved as a new output version; null = no edit. */
  editedOutput?: string | null;
}): Promise<ReviewOutcome | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('review_task_run', {
    p_task_run_id: params.taskRunId,
    p_decision: params.decision,
    p_note: params.note,
    // An edit only applies when approving — a rejected draft is discarded, not versioned.
    p_edited_output: params.decision === 'approved' ? (params.editedOutput ?? null) : null,
  });
  if (error) {
    console.error('recordApproval failed:', error.message);
    return null;
  }
  return parseReviewOutcome(data);
}
