-- Policy integrity — live check (ADR-0031 point 6 · PenTest F-03, F-18 · SR-04, SR-14).
--
-- WHAT IT DOES: picks an organization's Accountable Leader (preferring an org that also has a
-- Frontline Doer), re-runs the PenTest attacks on the policy (which 20261122130000_policy_leader_only.sql
-- must REFUSE) and the normal leader paths (which must still WORK), and prints one row per check. CI
-- has no database (ADR-0016), so this is how we prove the live behavior.
--
-- NOTHING IS KEPT: the script creates throwaway policies named 'policy-integrity-check' to test against,
-- and EVERYTHING it does (those policies, their rules, any status change to the org's real policy) is
-- rolled back at the end. Each check also runs in its own savepoint. Read-only in effect. Safe to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard → SQL Editor → New query → paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary results
--      table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS     = behaved exactly as ADR-0031 says.
--        FAIL     = an attack worked (it was undone), or a normal leader path was refused.
--        CHECK    = refused, but for a different reason than expected — send the detail column.
--        SKIPPED  = needs data this project doesn't have (a Frontline Doer, or a second org).

drop table if exists pg_temp.policy_check_results;
create temp table policy_check_results (
  n int,
  finding text,
  attempt text,
  expected text,
  outcome text,
  detail text
);

do $check$
declare
  v_leader uuid;          -- an Accountable Leader we act as
  v_org uuid;             -- their organization
  v_member uuid;          -- a Frontline Doer in the same org (null if there isn't one)
  v_other_policy uuid;    -- a policy in another organization (or a random id)
  v_active uuid;          -- the org's real active policy before the check (may be null)
  d_ready uuid;           -- throwaway draft with one rule
  d_empty uuid;           -- throwaway draft with no rules
  a_old uuid;             -- throwaway archived policy
  v_target uuid;          -- where the "append to the live policy" attack aims
  v_out text;
  v_now_active uuid;
  v_status text;
  v_count int;
  v_res jsonb := '[]'::jsonb; -- results survive the final rollback because they live in a variable
  v_outcome text;
  v_detail text;
  v_n int := 0;
  i int;
begin
  -- Setup (as the admin running this script): prefer a leader whose org also has a Frontline Doer.
  select l.user_id, l.org_id, m.user_id into v_leader, v_org, v_member
  from public.profile l
  left join public.profile m on m.org_id = l.org_id and m.role = 'frontline_doer'
  where l.role = 'accountable_leader'
  order by (m.user_id is null), l.created_at desc
  limit 1;

  if v_leader is null then
    insert into policy_check_results values (0, 'setup', 'Find an Accountable Leader', 'one exists',
      'SKIPPED', 'No Accountable Leader in this project.');
    return;
  end if;

  select id into v_other_policy from public.policy where org_id <> v_org limit 1;
  v_other_policy := coalesce(v_other_policy, gen_random_uuid());
  select id into v_active from public.policy where org_id = v_org and status = 'active';

  -- Everything below is undone by the final raise (errcode PC999).
  begin
    -- Throwaway policies (created as admin, so RLS doesn't apply to the setup itself).
    insert into public.policy (org_id, name, status) values (v_org, 'policy-integrity-check', 'draft')
      returning id into d_ready;
    insert into public.policy_rule (policy_id, rule_text, category, risk_tier, origin)
      values (d_ready, 'policy-integrity-check rule', 'transparency', 'low', 'custom');
    insert into public.policy (org_id, name, status) values (v_org, 'policy-integrity-check', 'draft')
      returning id into d_empty;
    insert into public.policy (org_id, name, status) values (v_org, 'policy-integrity-check', 'archived')
      returning id into a_old;
    v_target := coalesce(v_active, d_ready);

    ------------------------------------------------------------------------------------------
    -- 1–5. Member (Frontline Doer) attacks
    ------------------------------------------------------------------------------------------
    for i in 1..5 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      if v_member is null then
        v_outcome := 'SKIPPED'; v_detail := 'This org has no Frontline Doer.';
      else
        perform set_config('request.jwt.claims',
          json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
        perform set_config('request.jwt.claim.sub', v_member::text, true);
        begin
          execute 'set local role authenticated';
          case i
            when 1 then
              execute format($q$update public.policy set status = 'active' where id = %L$q$, d_ready);
              v_outcome := 'FAIL — a member changed a policy status (undone)';
              v_detail := 'accepted, then undone';
            when 2 then
              execute format($q$select public.activate_policy(%L)$q$, d_ready) into v_out;
              v_outcome := case when v_out = 'not_leader' then 'PASS'
                                else 'FAIL — a member activated a policy (undone)' end;
              v_detail := format('function said %s', v_out);
            when 3 then
              execute $q$select public.discard_draft_policies()$q$ into v_out;
              v_outcome := case when v_out = 'not_leader' then 'PASS'
                                else 'FAIL — a member discarded drafts (undone)' end;
              v_detail := format('function said %s', v_out);
            when 4 then
              execute format($q$insert into public.policy_rule (policy_id, rule_text, category, risk_tier, origin)
                                values (%L, 'injected', 'transparency', 'low', 'custom')$q$, v_target);
              v_outcome := 'FAIL — a member added a rule (undone)';
              v_detail := 'accepted, then undone';
            else
              execute format($q$insert into public.policy (org_id, name) values (%L, 'member-made')$q$, v_org);
              v_outcome := 'FAIL — a member created a policy (undone)';
              v_detail := 'accepted, then undone';
          end case;
          raise exception using errcode = 'P0001', message = 'undo';
        exception when others then
          if v_outcome is null or sqlstate <> 'P0001' then
            v_outcome := case when sqlstate = '42501' then 'PASS'
                              else 'CHECK — refused, but not for the expected reason' end;
            v_detail := sqlstate || ': ' || sqlerrm;
          end if;
        end;
      end if;
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-03',
        'a', (array['Member sets a policy active directly (Data API)',
                    'Member calls activate_policy',
                    'Member calls discard_draft_policies',
                    'Member adds a rule to the live policy',
                    'Member creates a policy'])[i],
        'e', (array['refused', 'not_leader', 'not_leader', 'refused', 'refused'])[i],
        'o', v_outcome, 'd', v_detail);
    end loop;

    -- From here on, act as the leader.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_leader, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_leader::text, true);

    ------------------------------------------------------------------------------------------
    -- 6–9. F-18: a failed activation leaves the org's active policy exactly as it was
    ------------------------------------------------------------------------------------------
    for i in 1..4 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      begin
        execute 'set local role authenticated';
        execute format($q$select public.activate_policy(%L)$q$,
          (array[gen_random_uuid(), v_other_policy, a_old, d_empty])[i]) into v_out;
        execute 'reset role';
        select id into v_now_active from public.policy where org_id = v_org and status = 'active';
        v_outcome := case
          when v_out = (array['not_found', 'not_found', 'not_draft', 'no_rules'])[i]
               and v_now_active is not distinct from v_active then 'PASS'
          else 'FAIL — the activation was not refused cleanly (undone)' end;
        v_detail := format('function said %s; active policy unchanged: %s',
                           v_out, v_now_active is not distinct from v_active);
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null then
          v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
      v_res := v_res || jsonb_build_object('n', v_n, 'f', 'F-18',
        'a', (array['Leader activates a made-up policy id',
                    'Leader activates another organization''s policy',
                    'Leader activates an archived policy',
                    'Leader activates a draft with no rules'])[i],
        'e', (array['not_found, old policy still active', 'not_found, old policy still active',
                    'not_draft, old policy still active', 'no_rules, old policy still active'])[i],
        'o', v_outcome, 'd', v_detail);
    end loop;

    ------------------------------------------------------------------------------------------
    -- 10. Normal: a leader activates a valid draft — all-or-nothing, exactly one active policy
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute format($q$select public.activate_policy(%L)$q$, d_ready) into v_out;
      execute 'reset role';
      select count(*) into v_count from public.policy where org_id = v_org and status = 'active';
      select status::text into v_status from public.policy where id = d_ready;
      v_outcome := case when v_out = 'ok' and v_count = 1 and v_status = 'active'
                          and (v_active is null
                               or (select status::text from public.policy where id = v_active) = 'archived')
                        then 'PASS' else 'FAIL — the normal activation did not switch cleanly' end;
      v_detail := format('function said %s; %s active policy; old one archived: %s',
        v_out, v_count,
        coalesce((select status::text from public.policy where id = v_active) = 'archived', true));
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Leader activates a draft with rules', 'e', 'ok, exactly 1 active, old one archived',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 11–13. Leaders, too, go through the functions; rules go only into drafts
    ------------------------------------------------------------------------------------------
    for i in 1..3 loop
      v_n := v_n + 1; v_outcome := null; v_detail := null;
      begin
        execute 'set local role authenticated';
        case i
          when 1 then
            execute format($q$update public.policy set status = 'active' where id = %L$q$, d_ready);
            v_outcome := 'FAIL — a direct status change was accepted (undone)';
            v_detail := 'accepted, then undone';
          when 2 then
            execute format($q$insert into public.policy_rule (policy_id, rule_text, category, risk_tier, origin)
                              values (%L, 'leader draft rule', 'transparency', 'low', 'custom')$q$, d_empty);
            v_outcome := 'PASS'; v_detail := 'accepted (then undone)';
          else
            execute format($q$insert into public.policy_rule (policy_id, rule_text, category, risk_tier, origin)
                              values (%L, 'appended', 'transparency', 'low', 'custom')$q$, a_old);
            v_outcome := 'FAIL — a rule was added to a non-draft policy (undone)';
            v_detail := 'accepted, then undone';
        end case;
        raise exception using errcode = 'P0001', message = 'undo';
      exception when others then
        if v_outcome is null or sqlstate <> 'P0001' then
          v_outcome := case when i = 2 then 'FAIL — a leader could not add a rule to a draft'
                            when sqlstate = '42501' then 'PASS'
                            else 'CHECK — refused, but not for the expected reason' end;
          v_detail := sqlstate || ': ' || sqlerrm;
        end if;
      end;
      v_res := v_res || jsonb_build_object('n', v_n, 'f', (array['F-03', 'normal', 'rule insert'])[i],
        'a', (array['Leader changes a status directly (Data API)',
                    'Leader adds a rule to a draft',
                    'Leader adds a rule to a non-draft policy'])[i],
        'e', (array['refused', 'accepted', 'refused'])[i], 'o', v_outcome, 'd', v_detail);
    end loop;

    ------------------------------------------------------------------------------------------
    -- 14. Normal: a leader discards drafts (archived, never deleted)
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role authenticated';
      execute $q$select public.discard_draft_policies()$q$ into v_out;
      execute 'reset role';
      select count(*) into v_count from public.policy where org_id = v_org and status = 'draft';
      select status::text into v_status from public.policy where id = d_empty;
      v_outcome := case when v_out = 'ok' and v_count = 0 and v_status = 'archived' then 'PASS'
                        else 'FAIL — drafts were not archived' end;
      v_detail := format('function said %s; %s draft(s) left; throwaway draft is %s', v_out, v_count, v_status);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null then
        v_outcome := 'CHECK — the function raised an error'; v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'normal',
      'a', 'Leader discards drafts ("start over")', 'e', 'ok, drafts archived',
      'o', v_outcome, 'd', v_detail);

    ------------------------------------------------------------------------------------------
    -- 15. A logged-out caller can't use the activation function
    ------------------------------------------------------------------------------------------
    v_n := v_n + 1; v_outcome := null; v_detail := null;
    begin
      execute 'set local role anon';
      execute format($q$select public.activate_policy(%L)$q$, d_ready) into v_out;
      v_outcome := 'FAIL — a logged-out caller reached the function';
      v_detail := format('function said %s (undone)', v_out);
      raise exception using errcode = 'P0001', message = 'undo';
    exception when others then
      if v_outcome is null or sqlstate <> 'P0001' then
        v_outcome := case when sqlstate = '42501' then 'PASS'
                          else 'CHECK — refused, but not for the expected reason' end;
        v_detail := sqlstate || ': ' || sqlerrm;
      end if;
    end;
    v_res := v_res || jsonb_build_object('n', v_n, 'f', 'access',
      'a', 'Call activate_policy while logged out', 'e', 'refused', 'o', v_outcome, 'd', v_detail);

    -- Undo everything: the throwaway policies, their rules and any status change.
    raise exception using errcode = 'PC999', message = 'policy-check-undo-all';
  exception when sqlstate 'PC999' then
    null;
  end;

  insert into policy_check_results
  select (x->>'n')::int, x->>'f', x->>'a', x->>'e', x->>'o', x->>'d'
  from jsonb_array_elements(v_res) as x;

  -- Proof nothing was kept: no throwaway policies, and the org's active policy is the same one.
  insert into policy_check_results
  select 99, 'cleanup', 'Nothing left behind; same active policy', '0 rows, unchanged',
    case when count(*) = 0
              and (select id from public.policy where org_id = v_org and status = 'active')
                  is not distinct from v_active
         then 'PASS' else 'FAIL — ' || count(*) || ' throwaway row(s) left or active policy changed' end,
    'policy rows named policy-integrity-check; the org''s active policy'
  from public.policy where name = 'policy-integrity-check';
end
$check$;

select n as "#", finding, attempt, expected, outcome, detail
from policy_check_results
order by n;
