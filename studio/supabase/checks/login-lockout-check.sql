-- Login lockout — live check (ADR-0037 · PenTest F-04 · SR-07).
--
-- WHAT IT DOES: drives login_guard / login_record the way the login action would, confirms the
-- per-account lock (5 failures -> locked, even with the "right" password), that a success clears it,
-- the per-IP lock (20 failures), and that direct access to either table is REFUSED. Prints one row
-- per check. CI has no database (ADR-0016), so this is how we prove the live behaviour.
--
-- NOTHING IS KEPT: every call and made-up row is rolled back at the end; each check runs in its own
-- savepoint. Safe to re-run. The doubling of the lock duration is covered by the unit + static tests
-- (it needs waiting out a real lock window, which a rolled-back script can't do).
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard -> SQL Editor -> New query -> paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS".
--   3. Read the results: PASS / FAIL / CHECK (refused for a different reason) / SKIPPED.

drop table if exists pg_temp.login_check_results;
create temp table login_check_results (
  n int, finding text, attempt text, expected text, outcome text, detail text
);

do $check$
declare
  v_email text := 'lockout-test@example.com';
  v_ip text := '203.0.113.50';
  v_ip2 text := '198.51.100.7';
  v_out text;
  v_count int;
  v_res jsonb := '[]'::jsonb;
  v_outcome text;
  v_detail text;
  v_n int := 0;
  i int;
begin
  begin
    ------------------------------------------------------------------------------------------
    -- 1. SR-07: 5 failures on one account -> locked, and the 6th sign-in is refused
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      for i in 1..5 loop
        perform public.login_record(v_email, v_ip, false);
      end loop;
      -- Guard from a DIFFERENT IP, so this proves the ACCOUNT lock (not the IP rule).
      select public.login_guard(v_email, v_ip2) into v_out;
      v_outcome := case when v_out = 'locked' then 'PASS'
                        else 'FAIL — the account was not locked after 5 failures (undone)' end;
      v_detail := format('after 5 failures, login_guard said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — a function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-04 / SR-07',
      'a', 'Guard after 5 failed logins on one account', 'e', 'locked', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 2. SR-07: a correct password clears the escalation (4 failures, then success -> not locked)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      for i in 1..4 loop
        perform public.login_record(v_email, v_ip, false);
      end loop;
      perform public.login_record(v_email, v_ip, true);
      select public.login_guard(v_email, v_ip2) into v_out;
      select count(*) into v_count from public.login_lock
        where email_hash = encode(extensions.digest(convert_to(lower(v_email), 'utf8'), 'sha256'), 'hex');
      v_outcome := case when v_out = 'ok' and v_count = 0 then 'PASS'
                        else 'FAIL — a successful login did not clear the failures (undone)' end;
      v_detail := format('after 4 failures + success, guard said %s; %s lock row(s)', v_out, v_count);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — a function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-04 / SR-07',
      'a', 'A correct password clears the failure count', 'e', 'ok, 0 rows', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 3. SR-07: 20 failures from one IP -> that IP is locked (using distinct emails, so no
    --    single account reaches 5)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      for i in 1..20 loop
        perform public.login_record('ip-test-' || i || '@example.com', v_ip, false);
      end loop;
      select public.login_guard('fresh-account@example.com', v_ip) into v_out;
      v_outcome := case when v_out = 'locked' then 'PASS'
                        else 'FAIL — the IP was not locked after 20 failures (undone)' end;
      v_detail := format('after 20 failures from one IP, guard said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — a function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-04 / SR-07',
      'a', 'Guard after 20 failed logins from one IP', 'e', 'locked', 'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 4–7. Direct access to the lockout tables is refused (no reading or clearing the counters)
    ------------------------------------------------------------------------------------------
    for i in 1..4 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      begin
        execute 'set local role authenticated';
        case i
          when 1 then execute $q$select count(*) from public.login_lock$q$ into v_count;
          when 2 then execute $q$delete from public.login_lock$q$;
          when 3 then execute $q$select count(*) from public.login_attempt$q$ into v_count;
          else execute $q$delete from public.login_attempt$q$;
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
      execute 'reset role';
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-04',
        'a', (array['Read login_lock directly', 'Delete login_lock rows (clear a lockout)',
                    'Read login_attempt directly', 'Delete login_attempt rows (clear the IP count)'])[i],
        'e', 'refused', 'o', v_outcome, 'd', v_detail);
    end loop;

    ------------------------------------------------------------------------------------------
    -- 8. A logged-out caller CAN call the guard (sign-in is pre-login) — returns a plain outcome
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      execute format($q$select public.login_guard(%L, %L)$q$, 'someone@example.com', v_ip2) into v_out;
      execute 'reset role';
      v_outcome := case when v_out in ('ok', 'locked') then 'PASS'
                        else 'FAIL — anon could not use the guard' end;
      v_detail := format('anon login_guard said %s', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the guard raised for anon'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'access',
      'a', 'Call the guard while logged out', 'e', 'ok or locked', 'o', v_outcome, 'd', v_detail);

    raise exception using errcode = 'RL999', message = 'login-check-undo-all';
  exception when sqlstate 'RL999' then
    null;
  end;

  insert into login_check_results
  select (x->>'n')::int, x->>'f', x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept: no rows for the test email/IP hashes remain.
  insert into login_check_results
  select 99, 'cleanup', 'No test rows left after the check', '0 row(s)',
    case when count(*) = 0 then 'PASS' else 'FAIL — ' || count(*) || ' row(s) now' end,
    'login_lock rows for the test account'
  from public.login_lock
  where email_hash = encode(extensions.digest(convert_to('lockout-test@example.com', 'utf8'), 'sha256'), 'hex');
end
$check$;

select n as "#", finding, attempt, expected, outcome, detail
from login_check_results order by n;
