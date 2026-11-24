-- Audit write-path — live check (ADR-0039 point 4 · PenTest F-14 re-test · BDD R11).
--
-- WHAT IT DOES: acts as the most recent signed-in user who ran a task, and proves that after the
-- migration (a) a DIRECT insert into audit_event is refused, and (b) write_audit_event enforces its
-- rules — it refuses the review-only kinds and unbacked/cross-org outcome events, and still accepts a
-- legitimate write. CI has no database (ADR-0016), so this is how we prove the live behavior.
--
-- NOTHING IS KEPT: every attempt runs inside its own savepoint and is undone on exit (accepted writes
-- are rolled back; a new helper run created for the "no backing" case is rolled back too). Read-only
-- in effect. Safe to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard -> SQL Editor -> New query -> paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS  = behaved exactly as ADR-0039 says.
--        FAIL  = a forbidden write was accepted, or a legitimate write was refused.
--        CHECK = refused/returned, but not for the expected reason — send the detail column.
--
-- Needs at least one governed run WITH a guardrail check (it borrows that run's user, org and run;
-- the Skill pipeline always records guardrail checks, so the most recent Skill run qualifies).

drop table if exists pg_temp.audit_write_results;
create temp table audit_write_results (
  n int,
  area text,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_uid uuid;          -- the signed-in user we act as
  v_org uuid;          -- their organization
  v_run uuid;          -- a run they did that HAS a guardrail check (legitimate task_completed)
  v_other_run uuid;    -- a run outside their organization (or a random id)
  v_result text;       -- the function's returned outcome
  v_state text;        -- sqlstate of a refused direct write
  v_msg text;
  v_accepted boolean;
  v_new_run uuid;      -- a fresh run with NO backing, for the no_backing case
  v_n int := 0;
begin
  -- Setup (as the admin running this script): a run that has at least one guardrail_check.
  select tr.run_by, tr.org_id, tr.id into v_uid, v_org, v_run
  from public.task_run tr
  where exists (select 1 from public.guardrail_check gc where gc.task_run_id = tr.id)
  order by tr.created_at desc
  limit 1;

  if v_uid is null then
    insert into audit_write_results values (0, 'setup', 'Find a recent run with a guardrail check',
      'a run exists', 'SKIPPED',
      'No task_run with a guardrail_check yet — run one Skill in the app, then re-run this check.');
    return;
  end if;

  select id into v_other_run from public.task_run where org_id <> v_org limit 1;
  v_other_run := coalesce(v_other_run, gen_random_uuid());

  -- Make auth.uid() return that user for the rest of this transaction.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  -- 1. DIRECT insert into audit_event is now refused outright (the F-14 vector). ------------------
  v_n := v_n + 1;
  v_accepted := false; v_state := null; v_msg := null;
  begin
    set local role authenticated;
    execute format(
      $q$insert into public.audit_event (org_id, task_run_id, actor, event_type, payload)
         values (%L, %L, %L, 'task_completed', '{}')$q$, v_org, v_run, v_uid);
    v_accepted := true;
    raise exception using errcode = 'P0001', message = 'undo';
  exception when others then
    reset role;
    if not v_accepted then v_state := sqlstate; v_msg := sqlerrm; end if;
  end;
  insert into audit_write_results values (v_n, 'audit_event',
    'Direct insert, bypassing the function (F-14 vector)', 'refused (42501)',
    case when v_accepted then 'FAIL — accepted (undone, nothing kept)'
         when v_state = '42501' then 'PASS'
         else 'CHECK — refused, but not for the expected reason' end,
    case when v_accepted then 'accepted, then undone' else v_state || ': ' || v_msg end);

  -- 2. write_audit_event refuses the review-only kinds. ------------------------------------------
  v_n := v_n + 1;
  begin
    set local role authenticated;
    v_result := public.write_audit_event(v_run, 'task_approved', '{}'::jsonb);
    reset role;
  exception when others then reset role; v_result := 'ERROR: ' || sqlerrm; end;
  insert into audit_write_results values (v_n, 'write_audit_event',
    'Forge task_approved via the function', 'forbidden_kind',
    case when v_result = 'forbidden_kind' then 'PASS' else 'FAIL/CHECK' end, v_result);

  -- 3. write_audit_event refuses an outcome event for another org's run. -------------------------
  v_n := v_n + 1;
  begin
    set local role authenticated;
    v_result := public.write_audit_event(v_other_run, 'task_completed', '{}'::jsonb);
    reset role;
  exception when others then reset role; v_result := 'ERROR: ' || sqlerrm; end;
  insert into audit_write_results values (v_n, 'write_audit_event',
    'Outcome event for another org''s run', 'invalid_run',
    case when v_result = 'invalid_run' then 'PASS' else 'FAIL/CHECK' end, v_result);

  -- 4. write_audit_event refuses an unknown kind. -----------------------------------------------
  v_n := v_n + 1;
  begin
    set local role authenticated;
    v_result := public.write_audit_event(v_run, 'made_up_event', '{}'::jsonb);
    reset role;
  exception when others then reset role; v_result := 'ERROR: ' || sqlerrm; end;
  insert into audit_write_results values (v_n, 'write_audit_event',
    'Invent a kind of event', 'unknown_kind',
    case when v_result = 'unknown_kind' then 'PASS' else 'FAIL/CHECK' end, v_result);

  -- 5. write_audit_event refuses an outcome event with no backing record. ------------------------
  --    Create a fresh run (no guardrail check) inside the savepoint, then roll it back.
  v_n := v_n + 1;
  begin
    set local role authenticated;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    select v_org, s.id, v_uid, 'running', 'audit write-path check'
    from public.skill s limit 1
    returning id into v_new_run;
    v_result := public.write_audit_event(v_new_run, 'task_completed', '{}'::jsonb);
    reset role;
    raise exception using errcode = 'P0001', message = 'undo';
  exception when sqlstate 'P0001' then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'task_completed for a run with no guardrail check', 'no_backing',
      case when v_result = 'no_backing' then 'PASS' else 'FAIL/CHECK' end, coalesce(v_result, 'n/a'));
  when others then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'task_completed for a run with no guardrail check', 'no_backing',
      'CHECK', 'setup error: ' || sqlerrm);
  end;

  -- 6. write_audit_event ACCEPTS a legitimate backed outcome event (then undone). ----------------
  v_n := v_n + 1;
  begin
    set local role authenticated;
    v_result := public.write_audit_event(v_run, 'task_completed', '{}'::jsonb);
    reset role;
    raise exception using errcode = 'P0001', message = 'undo';
  exception when sqlstate 'P0001' then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'Legitimate task_completed (run has a guardrail check)', 'ok',
      case when v_result = 'ok' then 'PASS' else 'FAIL/CHECK' end, coalesce(v_result, 'n/a'));
  when others then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'Legitimate task_completed (run has a guardrail check)', 'ok',
      'CHECK', 'error: ' || sqlerrm);
  end;

  -- 7. write_audit_event ACCEPTS a legitimate informational event (then undone). -----------------
  v_n := v_n + 1;
  begin
    set local role authenticated;
    v_result := public.write_audit_event(null, 'policy_edited', '{}'::jsonb);
    reset role;
    raise exception using errcode = 'P0001', message = 'undo';
  exception when sqlstate 'P0001' then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'Legitimate org-wide event (policy_edited, no run)', 'ok',
      case when v_result = 'ok' then 'PASS' else 'FAIL/CHECK' end, coalesce(v_result, 'n/a'));
  when others then
    reset role;
    insert into audit_write_results values (v_n, 'write_audit_event',
      'Legitimate org-wide event (policy_edited, no run)', 'ok',
      'CHECK', 'error: ' || sqlerrm);
  end;
end
$check$;

select n as "#", area, attempt, expected, outcome, detail
from audit_write_results
order by n;
