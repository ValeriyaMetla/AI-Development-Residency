-- Co-Pilot "don't" assessments can't be approved — live check (ADR-0036).
--
-- WHAT IT DOES: acts as the most recent signed-in user who ran a task, and tries to approve a
-- flagged Co-Pilot run whose assessment says "Don't use AI for this" — directly through the
-- protected review step, the way a Data API call would. That must be REFUSED. It also checks the
-- normal paths still work: "Don't go ahead" (reject) on such a run, and approving a run whose
-- assessment says "Use with conditions". Prints one row per check.
--
-- NOTHING IS KEPT: the script creates a few throwaway runs and assessments to test against, and
-- EVERYTHING it does (those rows, any approval and audit event) is rolled back at the end. Each
-- check runs in its own savepoint. Read-only in effect. Safe to re-run.
--
-- HOW TO RUN (after 20261123120000_review_refuses_dont_approval.sql is applied):
--   1. Supabase dashboard → SQL Editor → New query → paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS     = behaved exactly as ADR-0036 says.
--        FAIL     = a "don't" run was approved (it was undone), or a normal path was refused.
--        SKIPPED  = needs data this project doesn't have (a governed run, or the Co-Pilot skill).
--
-- Needs at least one governed run in the database (it borrows that run's user and org).

drop table if exists pg_temp.dont_check_results;
create temp table dont_check_results (
  n int,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_uid uuid;
  v_org uuid;
  v_skill uuid;          -- the Governance Co-Pilot skill
  r_dont_approve uuid;   -- throwaway runs (all rolled back at the end)
  r_dont_extra uuid;
  r_dont_reject uuid;
  r_conditions uuid;
  v_out text;
  v_status text;
  v_count int;
  v_res jsonb := '[]'::jsonb; -- results survive the final rollback because they live in a variable
  v_outcome text;
  v_detail text;
  v_n int := 0;
begin
  select tr.run_by, tr.org_id into v_uid, v_org
  from public.task_run tr
  order by tr.created_at desc
  limit 1;
  select id into v_skill from public.skill where key = 'governance_copilot';

  if v_uid is null or v_skill is null then
    insert into dont_check_results values (0, 'Find a recent run and the Co-Pilot skill',
      'both exist', 'SKIPPED', 'Run one Skill or Co-Pilot assessment in the app, then re-run.');
    return;
  end if;

  begin
    -- Throwaway flagged Co-Pilot runs + their assessments (as admin, so RLS doesn't apply here).
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'dont-check')
    returning id into r_dont_approve;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'dont-check')
    returning id into r_dont_extra;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'dont-check')
    returning id into r_dont_reject;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'dont-check')
    returning id into r_conditions;

    insert into public.copilot_assessment (task_run_id, verdict, tier, human_decision_required)
    values (r_dont_approve, 'dont', 'prohibited', true),
           (r_dont_extra, 'dont', 'prohibited', true),
           (r_dont_reject, 'dont', 'prohibited', true),
           (r_conditions, 'use_with_conditions', 'high', true);

    -- Make auth.uid() return that user for the rest of this transaction.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_uid::text, true);

    ------------------------------------------------------------------------------------------
    -- 1. Approve a "don't" run through the protected step (as the app or a direct API call would)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved')$q$, r_dont_approve)
        into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_dont_approve;
      select count(*) into v_count from public.approval where task_run_id = r_dont_approve;
      v_outcome := case when v_out = 'not_approvable' and v_status = 'needs_review' and v_count = 0
                        then 'PASS' else 'FAIL — the "don''t" run was approved (undone)' end;
      v_detail := format('function said %s; status %s; %s approval row(s)', v_out, v_status, v_count);
    exception when others then
      v_outcome := 'FAIL — unexpected error'; v_detail := sqlstate || ': ' || sqlerrm;
    end;
    v_res := v_res || jsonb_build_object('n', v_n,
      'a', 'Approve a "Don''t use AI for this" run', 'e', 'refused (not_approvable)',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 2. Add a second, harmless-looking assessment to a "don't" run, then approve
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1;
    begin
      execute 'set local role authenticated';
      execute format($q$insert into public.copilot_assessment (task_run_id, verdict, tier)
                        values (%L, 'use', 'minimal')$q$, r_dont_extra);
      execute format($q$select public.review_task_run(%L, 'approved')$q$, r_dont_extra)
        into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_dont_extra;
      v_outcome := case when v_out = 'not_approvable' and v_status = 'needs_review' then 'PASS'
                        else 'FAIL — approved after adding a "use" row (undone)' end;
      v_detail := format('function said %s; status %s', v_out, v_status);
    exception when others then
      -- If the insert itself is refused, the bypass is blocked even earlier: still a pass.
      execute 'reset role';
      v_outcome := 'PASS'; v_detail := 'insert refused — ' || sqlstate || ': ' || sqlerrm;
    end;
    v_res := v_res || jsonb_build_object('n', v_n,
      'a', 'Add a "use" assessment to a "don''t" run, then approve', 'e', 'still refused',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 3. "Don't go ahead" (reject) on a "don't" run — must still work
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'rejected')$q$, r_dont_reject)
        into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_dont_reject;
      v_outcome := case when v_out = 'ok' and v_status = 'rejected' then 'PASS'
                        else 'FAIL — rejecting was refused' end;
      v_detail := format('function said %s; status %s', v_out, v_status);
    exception when others then
      v_outcome := 'FAIL — unexpected error'; v_detail := sqlstate || ': ' || sqlerrm;
    end;
    v_res := v_res || jsonb_build_object('n', v_n,
      'a', '"Don''t go ahead" on a "don''t" run', 'e', 'works (ok)', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 4. Approve a "Use with conditions" run — the normal path must still work
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved')$q$, r_conditions)
        into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_conditions;
      v_outcome := case when v_out = 'ok' and v_status = 'approved' then 'PASS'
                        else 'FAIL — a normal approval was refused' end;
      v_detail := format('function said %s; status %s', v_out, v_status);
    exception when others then
      v_outcome := 'FAIL — unexpected error'; v_detail := sqlstate || ': ' || sqlerrm;
    end;
    v_res := v_res || jsonb_build_object('n', v_n,
      'a', 'Approve a "Use with conditions" run', 'e', 'works (ok)', 'o', v_outcome,
      'd', v_detail);

    -- Undo everything: the throwaway runs, assessments, approvals and audit events.
    raise exception using errcode = 'DC999', message = 'dont-check-undo-all';
  exception when sqlstate 'DC999' then
    null;
  end;

  insert into dont_check_results
  select (x->>'n')::int, x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept.
  insert into dont_check_results
  select 99, 'No throwaway runs left behind', '0 rows',
    case when count(*) = 0 then 'PASS' else 'FAIL — ' || count(*) || ' row(s) left' end,
    'task_run rows with input_summary = dont-check'
  from public.task_run where input_summary = 'dont-check';
end
$check$;

select n as "#", attempt, expected, outcome, detail
from dont_check_results
order by n;
