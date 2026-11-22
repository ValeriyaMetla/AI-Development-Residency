-- Audit integrity — live check (ADR-0026 point 6).
--
-- WHAT IT DOES: acts as the most recent signed-in user who ran a task, tries every write that
-- 20261118100000_audit_insert_integrity.sql must REFUSE, plus the normal writes that must still
-- WORK, and prints one row per attempt. CI has no database (ADR-0016), so this is how we prove the
-- live behavior.
--
-- NOTHING IS KEPT: every attempt runs inside its own savepoint. If a write is refused, nothing
-- happened; if a write is accepted, the script immediately raises an error inside that savepoint,
-- which undoes it. Read-only in effect. Safe to re-run.
--
-- HOW TO RUN (after the migration is applied):
--   1. Supabase dashboard → SQL Editor → New query → paste this whole file.
--   2. Click Run. If asked about RLS, choose "Run without RLS" (it creates a temporary
--      results table; "Run and enable RLS" would mangle the script).
--   3. Read the results table:
--        PASS   = behaved exactly as ADR-0026 says.
--        FAIL   = a forbidden write was accepted (it was undone), or a normal write was refused.
--        CHECK  = refused, but for a different reason than expected — send the detail column.
--      Last two rows report on existing history (not pass/fail of the migration itself).
--
-- Needs at least one governed run in the database (it borrows that run's user and org).

drop table if exists pg_temp.audit_check_results;
create temp table audit_check_results (
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
  v_run uuid;          -- a run they did
  v_other_uid uuid;    -- someone else (or a random id if the org has one member)
  v_other_org uuid;    -- another organization (or a random id)
  v_other_run uuid;    -- a run outside their organization (or a random id)
  v_existing uuid;     -- an existing audit entry of theirs, for the change/delete attempts
  c record;
  v_state text;
  v_msg text;
  v_accepted boolean;
  v_n int := 0;
begin
  -- Setup (as the admin running this script).
  select tr.run_by, tr.org_id, tr.id into v_uid, v_org, v_run
  from public.task_run tr
  order by tr.created_at desc
  limit 1;

  if v_uid is null then
    insert into audit_check_results values (0, 'setup', 'Find a recent run', 'a run exists',
      'SKIPPED', 'No task_run rows yet — run one Skill in the app, then re-run this check.');
    return;
  end if;

  select user_id into v_other_uid from public.profile where user_id <> v_uid limit 1;
  v_other_uid := coalesce(v_other_uid, gen_random_uuid());
  select id into v_other_org from public.org where id <> v_org limit 1;
  v_other_org := coalesce(v_other_org, gen_random_uuid());
  select id into v_other_run from public.task_run where org_id <> v_org limit 1;
  v_other_run := coalesce(v_other_run, gen_random_uuid());
  select id into v_existing from public.audit_event where org_id = v_org limit 1;

  -- Make auth.uid() return that user for the rest of this transaction.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  for c in
    select * from (values
      -- audit_event: must be REFUSED
      ('audit_event', 'Backdate an entry (choose its time)', 'refused', '42501',
        format($q$insert into public.audit_event (org_id, actor, event_type, created_at)
                  values (%L, %L, 'task_completed', now() - interval '30 days')$q$, v_org, v_uid)),
      ('audit_event', 'Choose an entry''s identifier', 'refused', '42501',
        format($q$insert into public.audit_event (id, org_id, actor, event_type)
                  values (gen_random_uuid(), %L, %L, 'task_completed')$q$, v_org, v_uid)),
      ('audit_event', 'Credit the entry to someone else', 'refused', '42501',
        format($q$insert into public.audit_event (org_id, actor, event_type)
                  values (%L, %L, 'task_completed')$q$, v_org, v_other_uid)),
      ('audit_event', 'Name no one as the person who acted', 'refused', '42501',
        format($q$insert into public.audit_event (org_id, actor, event_type)
                  values (%L, null, 'task_completed')$q$, v_org)),
      ('audit_event', 'Attach the entry to another organization''s run', 'refused', '42501',
        format($q$insert into public.audit_event (org_id, task_run_id, actor, event_type)
                  values (%L, %L, %L, 'task_completed')$q$, v_org, v_other_run, v_uid)),
      ('audit_event', 'Write into another organization', 'refused', '42501',
        format($q$insert into public.audit_event (org_id, actor, event_type)
                  values (%L, %L, 'task_completed')$q$, v_other_org, v_uid)),
      ('audit_event', 'Invent a kind of event', 'refused', '23514',
        format($q$insert into public.audit_event (org_id, actor, event_type)
                  values (%L, %L, 'made_up_event')$q$, v_org, v_uid)),
      ('audit_event', 'Change an existing entry', 'refused', '42501',
        format($q$update public.audit_event set payload = payload where id = %L$q$, v_existing)),
      ('audit_event', 'Delete an existing entry', 'refused', '42501',
        format($q$delete from public.audit_event where id = %L$q$, v_existing)),
      ('audit_event', 'Clear the whole log', 'refused', '42501',
        $q$truncate public.audit_event$q$),
      -- audit_event: normal writes must still WORK (then undone)
      ('audit_event', 'Normal entry about your own run', 'accepted', null,
        format($q$insert into public.audit_event (org_id, task_run_id, actor, event_type, payload)
                  values (%L, %L, %L, 'task_completed', '{}')$q$, v_org, v_run, v_uid)),
      ('audit_event', 'Normal organization-wide entry (no run)', 'accepted', null,
        format($q$insert into public.audit_event (org_id, actor, event_type, payload)
                  values (%L, %L, 'policy_edited', '{}')$q$, v_org, v_uid)),
      -- approval
      ('approval', 'Backdate an approval', 'refused', '42501',
        format($q$insert into public.approval (task_run_id, decided_by, decision, created_at)
                  values (%L, %L, 'approved', now() - interval '30 days')$q$, v_run, v_uid)),
      ('approval', 'Choose an approval''s identifier', 'refused', '42501',
        format($q$insert into public.approval (id, task_run_id, decided_by, decision)
                  values (gen_random_uuid(), %L, %L, 'approved')$q$, v_run, v_uid)),
      -- ADR-0028: approvals are now recorded ONLY through review_task_run, so a direct insert is
      -- refused even with valid values. (review-integrity-check.sql tests the normal review path.)
      ('approval', 'Direct approval insert (now only via review_task_run)', 'refused', '42501',
        format($q$insert into public.approval (task_run_id, decided_by, decision)
                  values (%L, %L, 'approved')$q$, v_run, v_uid)),
      -- run_correction
      ('run_correction', 'Backdate a correction', 'refused', '42501',
        format($q$insert into public.run_correction (task_run_id, created_by, kind, note, created_at)
                  values (%L, %L, 'note', 'audit integrity check', now() - interval '30 days')$q$,
               v_run, v_uid)),
      ('run_correction', 'Choose a correction''s identifier', 'refused', '42501',
        format($q$insert into public.run_correction (id, task_run_id, created_by, kind, note)
                  values (gen_random_uuid(), %L, %L, 'note', 'audit integrity check')$q$,
               v_run, v_uid)),
      ('run_correction', 'Normal correction (still works)', 'accepted', null,
        format($q$insert into public.run_correction (task_run_id, created_by, kind, note)
                  values (%L, %L, 'note', 'audit integrity check')$q$, v_run, v_uid))
    ) as t(area, attempt, expected, want_state, sql)
  loop
    v_n := v_n + 1;
    v_state := null;
    v_msg := null;
    v_accepted := false;

    -- One savepoint per attempt: the role switch and any accepted write are both undone on exit.
    begin
      execute 'set local role authenticated';
      execute c.sql;
      v_accepted := true;
      raise exception using errcode = 'P0001', message = 'audit-check-undo';
    exception when others then
      if not v_accepted then
        v_state := sqlstate;
        v_msg := sqlerrm;
      end if;
    end;

    insert into audit_check_results values (
      v_n, c.area, c.attempt, c.expected,
      case
        when c.expected = 'accepted' and v_accepted then 'PASS'
        when c.expected = 'accepted' then 'FAIL — a normal write was refused'
        when v_accepted then 'FAIL — accepted (undone, nothing kept)'
        when v_state = c.want_state then 'PASS'
        else 'CHECK — refused, but not for the expected reason'
      end,
      case when v_accepted then 'accepted, then undone' else v_state || ': ' || v_msg end
    );
  end loop;

  -- History: do all EXISTING entries already use the known kinds? (Try to validate the
  -- constraint inside a savepoint, then undo — this decides whether it can later be validated.)
  v_n := v_n + 1;
  begin
    alter table public.audit_event validate constraint audit_event_known_type;
    raise exception using errcode = 'P0001', message = 'audit-check-undo';
  exception
    when sqlstate 'P0001' then
      insert into audit_check_results values (v_n, 'history',
        'Existing entries all use the known kinds', 'yes', 'YES',
        'Safe to validate the constraint for old entries too (optional follow-up).');
    when others then
      insert into audit_check_results values (v_n, 'history',
        'Existing entries all use the known kinds', 'yes', 'NO',
        sqlstate || ': ' || sqlerrm || ' — leave the constraint NOT VALID; report this.');
  end;

  v_n := v_n + 1;
  insert into audit_check_results
  select v_n, 'history', 'Known-kinds rule is in place', 'present',
    case when count(*) = 1 then 'YES' else 'NO' end,
    coalesce(max(case when convalidated then 'validated for all rows'
                      else 'enforced for new rows only (NOT VALID)' end), 'constraint missing')
  from pg_constraint
  where conname = 'audit_event_known_type';
end
$check$;

select n as "#", area, attempt, expected, outcome, detail
from audit_check_results
order by n;
