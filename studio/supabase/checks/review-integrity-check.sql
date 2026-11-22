-- Review integrity — live check (ADR-0028 point 6 · PenTest F-01, F-21 · SR-01).
--
-- WHAT IT DOES: acts as the most recent signed-in user who ran a task, re-runs the PenTest attacks
-- on the human-review gate (which 20261121120000_review_task_run.sql must REFUSE) and the normal
-- paths (which must still WORK), and prints one row per check. CI has no database (ADR-0016), so
-- this is how we prove the live behavior.
--
-- NOTHING IS KEPT: the script creates a few throwaway runs to test against, and EVERYTHING it does
-- (those runs, any accepted write, every approval and audit event) is rolled back at the end. Each
-- check also runs in its own savepoint. Read-only in effect. Safe to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard → SQL Editor → New query → paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS     = behaved exactly as ADR-0028 says.
--        FAIL     = an attack worked (it was undone), or a normal path was refused.
--        CHECK    = refused, but for a different reason than expected — send the detail column.
--        SKIPPED  = needs data this project doesn't have (e.g. a second member in the org).
--
-- Needs at least one governed run in the database (it borrows that run's user and org).

drop table if exists pg_temp.review_check_results;
create temp table review_check_results (
  n int,
  finding text,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_uid uuid;            -- the signed-in user we act as
  v_org uuid;            -- their organization
  v_other_uid uuid;      -- another member of the same org (null if there isn't one)
  v_other_org_run uuid;  -- a run in another organization (or a random id)
  v_skill uuid;          -- any skill, for the throwaway runs
  v_label text := 'AI-generated with Claude (Sonnet)';
  r_review uuid;         -- throwaway runs (all rolled back at the end)
  r_review2 uuid;
  r_review3 uuid;
  r_running uuid;
  r_completed uuid;
  r_other_running uuid;
  v_rows int;
  v_out text;
  v_status text;
  v_count int;
  v_label_got text;
  v_res jsonb := '[]'::jsonb; -- results survive the final rollback because they live in a variable
  v_outcome text;
  v_detail text;
  v_n int := 0;
begin
  -- Setup (as the admin running this script): borrow the latest run's user and org.
  select tr.run_by, tr.org_id into v_uid, v_org
  from public.task_run tr
  order by tr.created_at desc
  limit 1;

  if v_uid is null then
    insert into review_check_results values (0, 'setup', 'Find a recent run', 'a run exists',
      'SKIPPED', 'No task_run rows yet — run one Skill in the app, then re-run this check.');
    return;
  end if;

  select user_id into v_other_uid from public.profile
  where org_id = v_org and user_id <> v_uid limit 1;
  select id into v_other_org_run from public.task_run where org_id <> v_org limit 1;
  v_other_org_run := coalesce(v_other_org_run, gen_random_uuid());
  select id into v_skill from public.skill limit 1;

  -- Everything below is undone by the final raise (errcode RC999).
  begin
    -- Throwaway runs to attack (created as admin, so RLS doesn't apply to the setup itself).
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'review-integrity-check')
    returning id into r_review;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'review-integrity-check')
    returning id into r_review2;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'needs_review', 'review-integrity-check')
    returning id into r_review3;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'running', 'review-integrity-check')
    returning id into r_running;
    insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
    values (v_org, v_skill, v_uid, 'completed', 'review-integrity-check')
    returning id into r_completed;
    if v_other_uid is not null then
      insert into public.task_run (org_id, skill_id, run_by, status, input_summary)
      values (v_org, v_skill, v_other_uid, 'running', 'review-integrity-check')
      returning id into r_other_running;
    end if;
    insert into public.task_output (task_run_id, content, provenance_label)
    values (r_review2, 'check draft', v_label);

    -- Make auth.uid() return that user for the rest of this transaction.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_uid::text, true);

    ------------------------------------------------------------------------------------------
    -- 1. F-01: set a flagged run to 'approved' directly, skipping Human Review
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$update public.task_run set status = 'approved' where id = %L$q$, r_review);
      get diagnostics v_rows = row_count;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_review;
      v_outcome := case when v_rows = 0 and v_status = 'needs_review' then 'PASS'
                        else 'FAIL — the run was approved directly (undone)' end;
      v_detail := format('%s row(s) changed; status is now %s', v_rows, v_status);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'PASS'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-01',
      'a', 'Set a flagged run to approved directly (Data API)', 'e', 'refused',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 2. F-01: finish your own running run as 'approved' (the pipeline's door, misused)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$update public.task_run set status = 'approved' where id = %L$q$, r_running);
      v_outcome := 'FAIL — accepted (undone, nothing kept)';
      v_detail := 'accepted, then undone';
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := case when sqlstate = '42501' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-01',
      'a', 'Mark your own running run approved', 'e', 'refused', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 3. F-01: change another member's run
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    if r_other_running is null then
      v_outcome := 'SKIPPED'; v_detail := 'This org has only one member.';
    else
      begin
        execute 'set local role authenticated';
        execute format($q$update public.task_run set status = 'completed' where id = %L$q$,
                       r_other_running);
        get diagnostics v_rows = row_count;
        execute 'reset role';
        select status into v_status from public.task_run where id = r_other_running;
        v_outcome := case when v_rows = 0 and v_status = 'running' then 'PASS'
                          else 'FAIL — changed another member''s run (undone)' end;
        v_detail := format('%s row(s) changed; status is now %s', v_rows, v_status);
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null then
          v_outcome := 'PASS'; v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
    end if;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-01',
      'a', 'Change another member''s run', 'e', 'refused', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 4. F-01: change a run column other than status (e.g. who ran it)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$update public.task_run set input_summary = 'changed' where id = %L$q$,
                     r_running);
      v_outcome := 'FAIL — accepted (undone, nothing kept)';
      v_detail := 'accepted, then undone';
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := case when sqlstate = '42501' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-01',
      'a', 'Change a run column other than status', 'e', 'refused', 'o', v_outcome,
      'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 5. F-01: record an approval directly, bypassing review_task_run
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$insert into public.approval (task_run_id, decided_by, decision)
                        values (%L, %L, 'approved')$q$, r_review, v_uid);
      v_outcome := 'FAIL — accepted (undone, nothing kept)';
      v_detail := 'accepted, then undone';
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := case when sqlstate = '42501' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-01',
      'a', 'Insert an approval directly', 'e', 'refused', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 6. F-21: approve a run that was never flagged
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved')$q$, r_completed) into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_completed;
      v_outcome := case when v_out = 'not_pending' and v_status = 'completed' then 'PASS'
                        else 'FAIL — an unflagged run was approved (undone)' end;
      v_detail := format('function said %s; status is %s', v_out, v_status);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-21',
      'a', 'Approve a run that was never flagged', 'e', 'not_pending', 'o', v_outcome,
      'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 7 + 8. Normal approve WORKS (all-or-nothing); F-21: a second decision is refused
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved', 'looks right')$q$, r_review)
        into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_review;
      select count(*) into v_count from public.approval where task_run_id = r_review;
      select count(*) into v_rows from public.audit_event
       where task_run_id = r_review and event_type = 'task_approved' and actor = v_uid;
      v_outcome := case when v_out = 'ok' and v_status = 'approved' and v_count = 1 and v_rows = 1
                        then 'PASS' else 'FAIL — the normal approve did not write everything' end;
      v_detail := format('function said %s; status %s; %s approval(s); %s audit event(s)',
                         v_out, v_status, v_count, v_rows);
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
        'a', 'Approve a flagged run (status + 1 approval + 1 audit event)', 'e', 'ok',
        'o', v_outcome, 'd', v_detail);

      -- 8. Now a second reviewer tries to overturn it.
      v_n := v_n + 1;
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'rejected')$q$, r_review) into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_review;
      select count(*) into v_count from public.approval where task_run_id = r_review;
      v_outcome := case when v_out = 'not_pending' and v_status = 'approved' and v_count = 1
                        then 'PASS' else 'FAIL — the decision was overturned (undone)' end;
      v_detail := format('function said %s; status %s; %s approval(s)', v_out, v_status, v_count);
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-21',
        'a', 'Overturn a decision with a second review', 'e', 'not_pending', 'o', v_outcome,
        'd', v_detail);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if sqlstate <> 'P0001' then
        v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal / F-21',
          'a', 'Approve, then overturn', 'e', 'ok, then not_pending',
          'o', 'CHECK — the function raised an error', 'd', sqlstate || ': ' || sqlerrm);
      end if;
    end;

    ------------------------------------------------------------------------------------------
    -- 9. Normal approve WITH an edit works (ADR-0022): new version, credited, label copied
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved', null, 'edited draft')$q$,
                     r_review2) into v_out;
      execute 'reset role';
      select count(*), max(provenance_label) into v_count, v_label_got
        from public.task_output where task_run_id = r_review2 and edited_by = v_uid;
      select count(*) into v_rows from public.task_output
       where task_run_id = r_review2 and edited_by is null;
      v_outcome := case when v_out = 'ok' and v_count = 1 and v_rows = 1 and v_label_got = v_label
                        then 'PASS' else 'FAIL — the edit was not saved as expected' end;
      v_detail := format('function said %s; %s edited version(s); AI original kept: %s; label: %s',
                         v_out, v_count, v_rows = 1, coalesce(v_label_got, 'none'));
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Approve with an edited draft (new version, AI original kept)', 'e', 'ok',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 10. An edit sent with a rejection is refused as invalid
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'rejected', null, 'sneaky edit')$q$,
                     r_review3) into v_out;
      execute 'reset role';
      select status into v_status from public.task_run where id = r_review3;
      v_outcome := case when v_out = 'invalid' and v_status = 'needs_review' then 'PASS'
                        else 'FAIL — accepted an edit with a rejection (undone)' end;
      v_detail := format('function said %s; status %s', v_out, v_status);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'input',
      'a', 'Send an edit with a rejection', 'e', 'invalid', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 11. Review another organization's run
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.review_task_run(%L, 'approved')$q$, v_other_org_run)
        into v_out;
      v_outcome := case when v_out = 'not_found' then 'PASS'
                        else 'FAIL — reviewed another org''s run (undone)' end;
      v_detail := format('function said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'isolation',
      'a', 'Review another organization''s run', 'e', 'not_found', 'o', v_outcome,
      'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 12. The pipeline still WORKS: finish your own running run as needs_review
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$update public.task_run set status = 'needs_review', updated_at = now()
                        where id = %L$q$, r_running);
      get diagnostics v_rows = row_count;
      v_outcome := case when v_rows = 1 then 'PASS'
                        else 'FAIL — the pipeline can no longer finish a run' end;
      v_detail := format('%s row(s) changed (then undone)', v_rows);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'FAIL — the pipeline can no longer finish a run';
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Pipeline finishes your own running run', 'e', 'accepted', 'o', v_outcome,
      'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 13. A logged-out caller can't use the review function
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      execute format($q$select public.review_task_run(%L, 'approved')$q$, r_review3) into v_out;
      v_outcome := 'FAIL — a logged-out caller reached the function';
      v_detail := format('function said %s (undone)', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := case when sqlstate = '42501' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'access',
      'a', 'Call the review function while logged out', 'e', 'refused', 'o', v_outcome,
      'd', v_detail);

    -- Undo everything: the throwaway runs, outputs, approvals and audit events.
    raise exception using errcode = 'RC999', message = 'review-check-undo-all';
  exception when sqlstate 'RC999' then
    null;
  end;

  insert into review_check_results
  select (x->>'n')::int, x->>'f', x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept.
  insert into review_check_results
  select 99, 'cleanup', 'No throwaway runs left behind', '0 rows',
    case when count(*) = 0 then 'PASS' else 'FAIL — ' || count(*) || ' row(s) left' end,
    'task_run rows with input_summary = review-integrity-check'
  from public.task_run where input_summary = 'review-integrity-check';
end
$check$;

select n as "#", finding, attempt, expected, outcome, detail
from review_check_results
order by n;
