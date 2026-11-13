import { createClient } from '@/lib/data/supabase/server';

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
