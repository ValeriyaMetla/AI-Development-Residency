-- AI request rate limits — live check (ADR-0030 point 8 · PenTest F-02 · SR-02 / SR-03).
--
-- WHAT IT DOES: acts as the most recent signed-in user who ran a task, calls claim_ai_request the
-- way an attacker or the app would, tries the direct-access attacks on the counter table (which
-- 20261122120000_ai_request_rate_limit.sql must REFUSE), checks each limit is hit at the right
-- number, and prints one row per check. CI has no database (ADR-0016), so this is how we prove the
-- live behavior.
--
-- NOTHING IS KEPT: every claim, every made-up counter row and the setup's clean slate for this user
-- are rolled back at the end. Each check also runs in its own savepoint. Read-only in effect. Safe
-- to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard → SQL Editor → New query → paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS     = behaved exactly as ADR-0030 says.
--        FAIL     = an attack worked or a limit didn't hold (it was undone), or a normal call failed.
--        CHECK    = refused, but for a different reason than expected — send the detail column.
--        SKIPPED  = needs data this project doesn't have (a second member, or a second org).
--
-- Needs at least one governed run in the database (it borrows that run's user and org).

drop table if exists pg_temp.rate_check_results;
create temp table rate_check_results (
  n int,
  finding text,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_uid uuid;           -- the signed-in user we act as
  v_org uuid;           -- their organization
  v_mate uuid;          -- another member of the same org (null if there isn't one)
  v_outsider uuid;      -- a member of a different org (null if there isn't one)
  v_before int;         -- this user's counter rows before the check (must match at the end)
  v_out text;
  v_outs text := '';
  v_count int;
  v_res jsonb := '[]'::jsonb; -- results survive the final rollback because they live in a variable
  v_outcome text;
  v_detail text;
  v_n int := 0;
  i int;
begin
  -- Setup (as the admin running this script): borrow the latest run's user and org.
  select tr.run_by, tr.org_id into v_uid, v_org
  from public.task_run tr
  order by tr.created_at desc
  limit 1;

  if v_uid is null then
    insert into rate_check_results values (0, 'setup', 'Find a recent run', 'a run exists',
      'SKIPPED', 'No task_run rows yet — run one Skill in the app, then re-run this check.');
    return;
  end if;

  select user_id into v_mate from public.profile
  where org_id = v_org and user_id <> v_uid limit 1;
  select user_id into v_outsider from public.profile where org_id <> v_org limit 1;
  select count(*) into v_before from public.ai_request where user_id = v_uid;

  -- Everything below is undone by the final raise (errcode RL999).
  begin
    -- A clean slate for this user, so their real recent requests don't skew the counts (undone).
    delete from public.ai_request where user_id = v_uid;

    -- Make auth.uid() return that user for the rest of this transaction.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_uid::text, true);

    ------------------------------------------------------------------------------------------
    -- 1. Normal: one claim is allowed and recorded (who, which org, which kind — no text)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute $q$select public.claim_ai_request('copilot')$q$ into v_out;
      execute 'reset role';
      select count(*) into v_count from public.ai_request
       where user_id = v_uid and org_id = v_org and kind = 'copilot';
      v_outcome := case when v_out = 'ok' and v_count = 1 then 'PASS'
                        else 'FAIL — a normal request was not recorded as expected' end;
      v_detail := format('function said %s; %s row(s) recorded', v_out, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Make one AI request', 'e', 'ok, 1 row', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 2. F-02: the 11th request in a minute is refused, and the refusal records nothing
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null; v_outs := '';
    begin
      execute 'set local role authenticated';
      for i in 1..11 loop
        execute $q$select public.claim_ai_request('skill')$q$ into v_out;
        v_outs := v_outs || case when i > 1 then ',' else '' end || v_out;
      end loop;
      execute 'reset role';
      select count(*) into v_count from public.ai_request where user_id = v_uid;
      v_outcome := case
        when v_outs = 'ok,ok,ok,ok,ok,ok,ok,ok,ok,ok,user_minute' and v_count = 10 then 'PASS'
        else 'FAIL — the per-minute limit did not hold (undone)' end;
      v_detail := format('11 calls said %s; %s row(s) recorded', v_outs, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-02',
      'a', 'Send 11 AI requests in one minute', 'e', '10 ok, 11th user_minute, 10 rows',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 3. F-02: the per-user day limit (200 earlier today → refused)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      insert into public.ai_request (user_id, org_id, kind, created_at)
      select v_uid, v_org, 'skill', now() - interval '1 hour' from generate_series(1, 200);
      execute 'set local role authenticated';
      execute $q$select public.claim_ai_request('skill')$q$ into v_out;
      execute 'reset role';
      v_outcome := case when v_out = 'user_day' then 'PASS'
                        else 'FAIL — the per-user day limit did not hold (undone)' end;
      v_detail := format('with 200 made-up requests from 1 hour ago, function said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-02',
      'a', 'Request after 200 today (per user)', 'e', 'user_day', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 4. F-02: the per-org day limit (1,000 by a teammate today → refused)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    if v_mate is null then
      v_outcome := 'SKIPPED'; v_detail := 'This org has only one member.';
    else
      begin
        insert into public.ai_request (user_id, org_id, kind, created_at)
        select v_mate, v_org, 'skill', now() - interval '1 hour' from generate_series(1, 1000);
        execute 'set local role authenticated';
        execute $q$select public.claim_ai_request('skill')$q$ into v_out;
        execute 'reset role';
        v_outcome := case when v_out = 'org_day' then 'PASS'
                          else 'FAIL — the per-org day limit did not hold (undone)' end;
        v_detail := format('with 1,000 made-up org requests from 1 hour ago, function said %s', v_out);
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null then
          v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
    end if;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-02',
      'a', 'Request after 1,000 today (per org)', 'e', 'org_day', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 5. F-02 / sign-up loophole: the platform ceiling (5,000 by another org today → refused)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    if v_outsider is null then
      v_outcome := 'SKIPPED'; v_detail := 'There is only one organization in this project.';
    else
      begin
        insert into public.ai_request (user_id, org_id, kind, created_at)
        select v_outsider, p.org_id, 'skill', now() - interval '1 hour'
          from public.profile p, generate_series(1, 5000)
         where p.user_id = v_outsider;
        execute 'set local role authenticated';
        execute $q$select public.claim_ai_request('skill')$q$ into v_out;
        execute 'reset role';
        v_outcome := case when v_out = 'platform_day' then 'PASS'
                          else 'FAIL — the platform ceiling did not hold (undone)' end;
        v_detail := format('with 5,000 made-up requests in another org, function said %s', v_out);
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null then
          v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
    end if;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-02',
      'a', 'Request after 5,000 today across the platform', 'e', 'platform_day',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 6–9. Direct access to the counter table is refused (no resetting your own count)
    ------------------------------------------------------------------------------------------
    for i in 1..4 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      begin
        execute 'set local role authenticated';
        case i
          when 1 then execute format($q$insert into public.ai_request (user_id, org_id, kind)
                                       values (%L, %L, 'skill')$q$, v_uid, v_org);
          when 2 then execute format($q$delete from public.ai_request where user_id = %L$q$, v_uid);
          when 3 then execute format($q$update public.ai_request set created_at = now() - interval '3 days'
                                       where user_id = %L$q$, v_uid);
          else execute $q$select count(*) from public.ai_request$q$ into v_count;
        end case;
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
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-02',
        'a', (array['Add a counter row directly', 'Delete your counter rows (reset your limit)',
                    'Backdate your counter rows', 'Read the counter table'])[i],
        'e', 'refused', 'o', v_outcome, 'd', v_detail);
    end loop;

    ------------------------------------------------------------------------------------------
    -- 10. Input: a made-up kind is refused and records nothing
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute $q$select public.claim_ai_request('anything-else')$q$ into v_out;
      execute 'reset role';
      select count(*) into v_count from public.ai_request where user_id = v_uid;
      v_outcome := case when v_out = 'invalid' and v_count = 0 then 'PASS'
                        else 'FAIL — a made-up kind was accepted (undone)' end;
      v_detail := format('function said %s; %s row(s) recorded', v_out, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'input',
      'a', 'Claim a made-up kind', 'e', 'invalid, 0 rows', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 11. Clean-up: rows older than 2 days are removed on the next request
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      insert into public.ai_request (user_id, org_id, kind, created_at)
      values (v_uid, v_org, 'skill', now() - interval '3 days');
      execute 'set local role authenticated';
      execute $q$select public.claim_ai_request('skill')$q$ into v_out;
      execute 'reset role';
      select count(*) into v_count from public.ai_request
       where user_id = v_uid and created_at < now() - interval '2 days';
      v_outcome := case when v_out = 'ok' and v_count = 0 then 'PASS'
                        else 'FAIL — old rows were not cleaned up' end;
      v_detail := format('function said %s; %s row(s) older than 2 days left', v_out, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Old counter rows are cleaned up', 'e', 'ok, 0 old rows', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 12. A logged-out caller can't use the function
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      execute $q$select public.claim_ai_request('skill')$q$ into v_out;
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
      'a', 'Call the function while logged out', 'e', 'refused', 'o', v_outcome, 'd', v_detail);

    -- Undo everything: every claim, made-up row and the clean slate.
    raise exception using errcode = 'RL999', message = 'rate-check-undo-all';
  exception when sqlstate 'RL999' then
    null;
  end;

  insert into rate_check_results
  select (x->>'n')::int, x->>'f', x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept: this user's counter rows are exactly as before.
  insert into rate_check_results
  select 99, 'cleanup', 'Counter rows unchanged after the check', v_before || ' row(s)',
    case when count(*) = v_before then 'PASS' else 'FAIL — ' || count(*) || ' row(s) now' end,
    'ai_request rows for the borrowed user'
  from public.ai_request where user_id = v_uid;
end
$check$;

select n as "#", finding, attempt, expected, outcome, detail
from rate_check_results
order by n;
