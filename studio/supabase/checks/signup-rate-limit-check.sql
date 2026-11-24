-- Sign-up limits — live check (ADR-0034 · PenTest F-07 · SR-11 / SR-12).
--
-- WHAT IT DOES: calls claim_signup_attempt the way the sign-up form would, confirms the 5/hour
-- per-IP limit holds and that a different IP has its own bucket, that the stored value is a hash
-- (not the raw IP), that direct access to signup_attempt is REFUSED, and that the org.name /
-- profile.display_name length constraints reject an oversized value. Prints one row per check.
-- CI has no database (ADR-0016), so this is how we prove the live behavior.
--
-- NOTHING IS KEPT: every claim, made-up row and constraint probe is rolled back at the end; each
-- check also runs in its own savepoint. Read-only in effect. Safe to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard -> SQL Editor -> New query -> paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS    = behaved exactly as ADR-0034 says.
--        FAIL    = an attack worked or a limit/constraint didn't hold (it was undone).
--        CHECK   = refused, but for a different reason than expected — send the detail column.
--        SKIPPED = needs data this project doesn't have.

drop table if exists pg_temp.signup_check_results;
create temp table signup_check_results (
  n int,
  finding text,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_ip1 text := '203.0.113.11';   -- documentation-range test IPs (RFC 5737), never real users
  v_ip2 text := '203.0.113.22';
  v_hash1 text := encode(extensions.digest(convert_to(v_ip1, 'utf8'), 'sha256'), 'hex');
  v_out text;
  v_outs text := '';
  v_count int;
  v_stored text;
  v_profile uuid;
  v_res jsonb := '[]'::jsonb; -- results survive the final rollback because they live in a variable
  v_outcome text;
  v_detail text;
  v_n int := 0;
  i int;
begin
  begin
    ------------------------------------------------------------------------------------------
    -- 1. SR-12: the 6th sign-up from one IP in an hour is refused; exactly 5 rows recorded
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null; v_outs := '';
    begin
      execute 'set local role anon';
      for i in 1..6 loop
        execute format($q$select public.claim_signup_attempt(%L)$q$, v_ip1) into v_out;
        v_outs := v_outs || case when i > 1 then ',' else '' end || v_out;
      end loop;
      execute 'reset role';
      select count(*) into v_count from public.signup_attempt where ip_hash = v_hash1;
      v_outcome := case when v_outs = 'ok,ok,ok,ok,ok,ip_hour' and v_count = 5 then 'PASS'
                        else 'FAIL — the per-IP hour limit did not hold (undone)' end;
      v_detail := format('6 calls said %s; %s row(s) recorded', v_outs, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07 / SR-12',
      'a', 'Six sign-ups from one IP in an hour', 'e', '5 ok, 6th ip_hour, 5 rows',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 2. SR-12: a different IP has its own bucket (still allowed after the first is maxed)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      for i in 1..5 loop
        execute format($q$select public.claim_signup_attempt(%L)$q$, v_ip1) into v_out;
      end loop;
      execute format($q$select public.claim_signup_attempt(%L)$q$, v_ip2) into v_out;
      execute 'reset role';
      v_outcome := case when v_out = 'ok' then 'PASS'
                        else 'FAIL — a second IP was wrongly blocked (undone)' end;
      v_detail := format('after 5 from IP #1, IP #2 said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07 / SR-12',
      'a', 'A different IP after the first is maxed', 'e', 'ok', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 3. Privacy: the stored value is a SHA-256 hash, never the raw IP
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      execute format($q$select public.claim_signup_attempt(%L)$q$, v_ip1) into v_out;
      execute 'reset role';
      select ip_hash into v_stored from public.signup_attempt where ip_hash = v_hash1 limit 1;
      v_outcome := case when v_stored = v_hash1 and v_stored <> v_ip1 and length(v_stored) = 64
                        then 'PASS' else 'FAIL — the raw IP may be stored (undone)' end;
      v_detail := format('stored a 64-hex hash, not %s', v_ip1);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07',
      'a', 'What the counter stores', 'e', 'a hash, not the raw IP', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 4–7. Direct access to the counter table is refused (no reading or resetting the IP count)
    ------------------------------------------------------------------------------------------
    for i in 1..4 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      begin
        execute 'set local role authenticated';
        case i
          when 1 then execute format($q$insert into public.signup_attempt (ip_hash)
                                       values (%L)$q$, v_hash1);
          when 2 then execute $q$delete from public.signup_attempt$q$;
          when 3 then execute $q$update public.signup_attempt set created_at = now() - interval '3 hours'$q$;
          else execute $q$select count(*) from public.signup_attempt$q$ into v_count;
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
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07',
        'a', (array['Add a counter row directly', 'Delete all counter rows (reset the IP limit)',
                    'Backdate counter rows', 'Read the counter table'])[i],
        'e', 'refused', 'o', v_outcome, 'd', v_detail);
    end loop;

    ------------------------------------------------------------------------------------------
    -- 8. SR-11: an oversized org name is refused by the CHECK constraint
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      insert into public.org (name) values (repeat('x', 200));
      v_outcome := 'FAIL — a 200-char org name was accepted (undone)';
      v_detail := 'accepted, then undone';
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := case when sqlstate = '23514' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07 / SR-11',
      'a', 'Create an org with a 200-char name', 'e', 'refused (23514)', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 9. SR-11: an oversized display name is refused by the CHECK constraint
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    select user_id into v_profile from public.profile limit 1;
    if v_profile is null then
      v_outcome := 'SKIPPED'; v_detail := 'No profile rows to probe the display_name limit.';
    else
      begin
        update public.profile set display_name = repeat('y', 100) where user_id = v_profile;
        v_outcome := 'FAIL — a 100-char display name was accepted (undone)';
        v_detail := 'accepted, then undone';
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null then
          v_outcome := case when sqlstate = '23514' then 'PASS'
                            else 'CHECK — refused, but not for the expected reason' end;
          v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
    end if;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-07 / SR-11',
      'a', 'Set a display name to 100 chars', 'e', 'refused (23514)', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 10. Clean-up: rows older than 2 hours are removed on the next claim
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      insert into public.signup_attempt (ip_hash, created_at)
      values (v_hash1, now() - interval '3 hours');
      execute 'set local role anon';
      execute format($q$select public.claim_signup_attempt(%L)$q$, v_ip2) into v_out;
      execute 'reset role';
      select count(*) into v_count from public.signup_attempt
       where created_at < now() - interval '2 hours';
      v_outcome := case when v_out = 'ok' and v_count = 0 then 'PASS'
                        else 'FAIL — old rows were not cleaned up' end;
      v_detail := format('function said %s; %s row(s) older than 2 hours left', v_out, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'cleanup',
      'a', 'Old counter rows are cleaned up', 'e', 'ok, 0 old rows', 'o', v_outcome, 'd', v_detail);

    -- Undo everything: every claim, made-up row and constraint probe.
    raise exception using errcode = 'RL999', message = 'signup-check-undo-all';
  exception when sqlstate 'RL999' then
    null;
  end;

  insert into signup_check_results
  select (x->>'n')::int, x->>'f', x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept: no rows for the test IP hashes remain.
  insert into signup_check_results
  select 99, 'cleanup', 'No test rows left after the check', '0 row(s)',
    case when count(*) = 0 then 'PASS' else 'FAIL — ' || count(*) || ' row(s) now' end,
    'signup_attempt rows for the documentation-range test IPs'
  from public.signup_attempt
  where ip_hash = encode(extensions.digest(convert_to('203.0.113.11', 'utf8'), 'sha256'), 'hex')
     or ip_hash = encode(extensions.digest(convert_to('203.0.113.22', 'utf8'), 'sha256'), 'hex');
end
$check$;

select n as "#", finding, attempt, expected, outcome, detail
from signup_check_results
order by n;
