-- Audit writes go through one protected step (ADR-0039 · PenTest F-14 · SR-15).
--
-- WHY: ADR-0026 locked who/when/what-kind, but a signed-in user could still POST a valid-looking
-- event (e.g. task_approved) straight to /rest/v1/audit_event for an action that never happened
-- (F-14, db/DB5-audit-forgery.txt -> 201 Created). SR-15: audit events only from the server step
-- that performs the action.
--
-- WHAT THIS DOES:
--   1. write_audit_event(...) — the ONLY way an app user's action reaches audit_event. It stamps
--      actor + org itself, refuses unknown kinds, refuses task_approved/task_rejected (those come
--      only from review_task_run, ADR-0028), and for outcome-claim kinds requires the action's own
--      record to already exist (no orphan outcome events).
--   2. App users lose ALL direct insert on audit_event (supersedes ADR-0026 points 1-2). The
--      function, running as the table owner, is the only writer.
--
-- Append-only (no update/delete), the known-kind CHECK constraint, and the approval/run_correction
-- protections from ADR-0026 are UNCHANGED.
--
-- HOW TO APPLY: Supabase -> SQL Editor -> paste -> Run -> "Run without RLS".
-- studio-pentest first, then live (right before merging — the old writeAuditEvent breaks the moment
-- insert is revoked, so migration + app PR go live together; see ADR-0039 Consequences).
-- Idempotent: safe to re-run. Verify with studio/supabase/checks/audit-write-path-check.sql.

-- ---------------------------------------------------------------------------
-- 1. The protected audit writer
-- ---------------------------------------------------------------------------
-- Elevated rights (security definer) so it bypasses RLS and MUST repeat every check itself.
-- search_path pinned so no one can shadow a table or function name. Returns a plain outcome:
--   'ok' · 'not_signed_in' · 'no_org' · 'unknown_kind' · 'forbidden_kind' · 'invalid_run' · 'no_backing'
create or replace function public.write_audit_event(
  p_task_run_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_run_org uuid;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  -- Who is asking, and for which org.
  if v_uid is null then
    return 'not_signed_in';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'no_org';
  end if;

  -- Known kinds only (mirrors AUDIT_EVENT_TYPES / the audit_event_known_type constraint, ADR-0026).
  if p_event_type not in (
    'pii_stripped', 'pii_kept', 'risky_use_flagged', 'task_blocked', 'task_completed',
    'task_approved', 'task_rejected', 'task_run_corrected', 'copilot_assessed',
    'policy_seeded', 'policy_edited', 'rule_suggestion_accepted', 'rule_suggestion_dismissed'
  ) then
    return 'unknown_kind';
  end if;

  -- Review decisions belong only to review_task_run (ADR-0028). A direct request for them is a forgery.
  if p_event_type in ('task_approved', 'task_rejected') then
    return 'forbidden_kind';
  end if;

  -- A run reference must be a run in the caller's own org (another org's run is refused).
  if p_task_run_id is not null then
    select tr.org_id into v_run_org
      from public.task_run tr
     where tr.id = p_task_run_id;
    if v_run_org is null or v_run_org <> v_org then
      return 'invalid_run';
    end if;
  end if;

  -- Outcome-claim kinds must be backed by the action's own record, so the trail can't carry a
  -- "completed / assessed / corrected" event with nothing behind it.
  if p_event_type in ('task_completed', 'task_blocked') then
    if p_task_run_id is null or not exists (
      select 1 from public.guardrail_check gc where gc.task_run_id = p_task_run_id
    ) then
      return 'no_backing';
    end if;
  elsif p_event_type = 'copilot_assessed' then
    if p_task_run_id is null or not exists (
      select 1 from public.copilot_assessment ca where ca.task_run_id = p_task_run_id
    ) then
      return 'no_backing';
    end if;
  elsif p_event_type = 'task_run_corrected' then
    if p_task_run_id is null or not exists (
      select 1 from public.run_correction rc
       where rc.task_run_id = p_task_run_id and rc.created_by = v_uid
    ) then
      return 'no_backing';
    end if;
  end if;

  -- Stamp identity + org ourselves; id + created_at fall to the column defaults (ADR-0026).
  insert into public.audit_event (org_id, task_run_id, actor, event_type, payload)
  values (v_org, p_task_run_id, v_uid, p_event_type, v_payload);

  return 'ok';
end;
$$;

comment on function public.write_audit_event(uuid, text, jsonb) is
  'The only way an app user''s action reaches audit_event: stamps actor + org, refuses unknown and '
  'review-only kinds, requires a backing record for outcome kinds, then inserts. ADR-0039.';

-- Only signed-in users may call it (Postgres grants EXECUTE to PUBLIC by default — remove that).
revoke all on function public.write_audit_event(uuid, text, jsonb) from public, anon;
grant execute on function public.write_audit_event(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. App users lose all direct insert — the function is now the only writer
--    (supersedes ADR-0026 points 1-2: the column grant + the org-scoped insert policy).
-- ---------------------------------------------------------------------------
revoke insert on public.audit_event from authenticated, anon;
drop policy if exists "audit_event_insert_org" on public.audit_event;
