-- Review decision once, through one protected step (ADR-0028 · PenTest F-01, F-21 · SR-01).
--
-- WHY: the old rule `task_run_update_org` let any member change any column of any run in their org
-- to any value, so a member could set a run 'approved' directly through the Data API and skip Human
-- Review (F-01). The app's own review path also didn't check the run was flagged or undecided (F-21).
--
-- WHAT THIS DOES:
--   1. `review_task_run(...)` — the ONLY way to record a review decision. One transaction: checks,
--      optional reviewer edit (ADR-0022), approval row, status flip, audit event.
--   2. Members may only move THEIR OWN run while it is 'running' (the pipeline's job), only the
--      status/updated_at columns, and never to 'approved' or 'rejected'.
--   3. One decision per run (unique rule) and no direct inserts into `approval`.
--
-- HOW TO APPLY: Supabase → SQL Editor → paste → Run → choose "Run without RLS".
-- studio-pentest first, then live (right before merging the PR — see ADR-0028 Consequences).
-- PRE-CHECK: no run may already have two approvals (checked 2026-11-21: live 0; studio-pentest
-- resolved to its first decision).

-- ---------------------------------------------------------------------------
-- 1. The protected review step
-- ---------------------------------------------------------------------------
-- Runs with elevated rights (security definer), so it bypasses RLS and MUST repeat every check
-- itself. search_path is pinned so no one can shadow a table or function name.
-- Returns a plain outcome instead of raising database error text:
--   'ok' · 'not_signed_in' · 'invalid' · 'not_found' · 'not_pending'
create or replace function public.review_task_run(
  p_task_run_id uuid,
  p_decision public.approval_decision,
  p_note text default null,
  p_edited_output text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_status public.task_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_ai_label text;
begin
  -- Who is asking, and for which org.
  if v_uid is null then
    return 'not_signed_in';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'not_found';
  end if;

  -- Same input limits as the app's parseReviewInput (lib/domain/approvals.ts): a direct call to
  -- this function skips the app, so the database enforces them too.
  if p_decision is null then
    return 'invalid';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    return 'invalid';
  end if;
  if p_edited_output is not null and (
       p_decision <> 'approved'
       or btrim(p_edited_output) = ''
       or char_length(p_edited_output) > 10000
     ) then
    return 'invalid';
  end if;

  -- Lock the run so two reviewers can't decide it at the same moment. Another org's run is
  -- reported exactly like a missing one (no hint that it exists).
  select tr.status
    into v_status
    from public.task_run tr
   where tr.id = p_task_run_id
     and tr.org_id = v_org
   for update;
  if not found then
    return 'not_found';
  end if;

  -- Only a flagged, undecided run can be reviewed — once (the first decision is final).
  if v_status <> 'needs_review' then
    return 'not_pending';
  end if;

  -- Reviewer edit (approve only, ADR-0022): a NEW output version credited to the reviewer; the
  -- AI original is kept. The base provenance label is copied from the AI's own draft rather than
  -- taken from the caller, so a direct call can't plant a misleading label.
  if p_edited_output is not null then
    select o.provenance_label
      into v_ai_label
      from public.task_output o
     where o.task_run_id = p_task_run_id
       and o.edited_by is null
     order by o.created_at desc
     limit 1;

    insert into public.task_output (task_run_id, content, provenance_label, edited_by)
    values (p_task_run_id, p_edited_output, v_ai_label, v_uid);
  end if;

  -- The durable, attributable decision (ADR-0020).
  insert into public.approval (task_run_id, decided_by, decision, note)
  values (p_task_run_id, v_uid, p_decision, v_note);

  -- The run leaves the review queue.
  update public.task_run
     set status = p_decision::text::public.task_status,
         updated_at = now()
   where id = p_task_run_id;

  -- The event-log entry: the decision fact only, no sensitive content (ADR-0006). The
  -- audit_event_known_type check (ADR-0026) still applies.
  insert into public.audit_event (org_id, task_run_id, actor, event_type, payload)
  values (
    v_org,
    p_task_run_id,
    v_uid,
    case when p_decision = 'approved' then 'task_approved' else 'task_rejected' end,
    '{}'::jsonb
  );

  return 'ok';
end;
$$;

comment on function public.review_task_run(uuid, public.approval_decision, text, text) is
  'The only way to record a review decision: checks org + needs_review, then writes the optional '
  'reviewer edit, the approval, the status flip and the audit event in one transaction. ADR-0028.';

-- Only signed-in users may call it (Postgres grants EXECUTE to PUBLIC by default — remove that).
revoke all on function public.review_task_run(uuid, public.approval_decision, text, text)
  from public, anon;
grant execute on function public.review_task_run(uuid, public.approval_decision, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Members may only move their own unfinished run — never to a review decision
-- ---------------------------------------------------------------------------
-- USING is checked against the row BEFORE the change, WITH CHECK against the row AFTER it.
drop policy if exists "task_run_update_org" on public.task_run;
drop policy if exists "task_run_update_own_running" on public.task_run;
create policy "task_run_update_own_running"
  on public.task_run for update
  to authenticated
  using (
    org_id = public.current_org_id()
    and run_by = (select auth.uid())
    and status = 'running'
  )
  with check (
    org_id = public.current_org_id()
    and run_by = (select auth.uid())
    and status in ('running', 'blocked', 'needs_review', 'completed')
  );

-- Only the two columns the pipeline changes (updateTaskRunStatus in lib/data/runs.ts).
revoke update on public.task_run from authenticated, anon;
grant update (status, updated_at) on public.task_run to authenticated;

-- ---------------------------------------------------------------------------
-- 3. One decision per run, recorded only through the function
-- ---------------------------------------------------------------------------
create unique index if not exists approval_one_per_run on public.approval (task_run_id);

-- Replaces ADR-0026's column-level insert grant: review_task_run is now the only writer.
revoke insert on public.approval from authenticated, anon;
