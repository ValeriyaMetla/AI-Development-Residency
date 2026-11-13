-- Step 5 — Row-Level Security policies (ADR-9: org_id + RLS tenancy).
--
-- The tables already have RLS ENABLED (deny-all) from the core schema migration.
-- These policies grant the minimum access: you read your own org + profile, any
-- signed-in user reads the global skill catalog, and all task/audit data is scoped
-- to your own organization. This is the product's core isolation guarantee.
--
-- Decisions (per Step 5 discussion): profile reads are OWN-ONLY for the MVP
-- (one-user-one-org); task data is ORG-scoped, not yet split by role (Leader sees
-- all / Doer sees own) — role-based filtering is deferred to when multi-user lands.
--
-- current_org_id(): returns the caller's org. SECURITY DEFINER + pinned search_path
-- so it reads profile WITHOUT re-triggering RLS — this avoids the well-known
-- "infinite recursion detected in policy for relation profile" trap you hit when a
-- policy on profile queries profile. STABLE: it reads, never writes.
-- auth.uid() is wrapped in a subselect per Supabase's RLS performance guidance.

-- ---------------------------------------------------------------------------
-- Table privileges. RLS filters rows, but a role must first be GRANTed access to
-- the table or every query fails with "permission denied". Grant the authenticated
-- role the table privileges; the RLS policies below are the real, per-row gate.
-- The anon (logged-out) role is granted nothing, so it has no access at all.
-- ALTER DEFAULT PRIVILEGES covers future tables created in this schema too.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

create or replace function public.current_org_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select org_id from public.profile where user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- profile — read your own row
-- ---------------------------------------------------------------------------
drop policy if exists "profile_select_own" on public.profile;
create policy "profile_select_own"
  on public.profile for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- org — read your own organization
-- ---------------------------------------------------------------------------
drop policy if exists "org_select_own" on public.org;
create policy "org_select_own"
  on public.org for select
  to authenticated
  using (id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- skill — global catalog, readable by any signed-in user
-- ---------------------------------------------------------------------------
drop policy if exists "skill_select_authenticated" on public.skill;
create policy "skill_select_authenticated"
  on public.skill for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- task_run — read / insert / update within your org (you run as yourself)
-- ---------------------------------------------------------------------------
drop policy if exists "task_run_select_org" on public.task_run;
create policy "task_run_select_org"
  on public.task_run for select
  to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "task_run_insert_org" on public.task_run;
create policy "task_run_insert_org"
  on public.task_run for insert
  to authenticated
  with check (org_id = public.current_org_id() and run_by = (select auth.uid()));

drop policy if exists "task_run_update_org" on public.task_run;
create policy "task_run_update_org"
  on public.task_run for update
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- task_output — scoped via its parent task_run's org
-- ---------------------------------------------------------------------------
drop policy if exists "task_output_select_org" on public.task_output;
create policy "task_output_select_org"
  on public.task_output for select
  to authenticated
  using (
    exists (
      select 1 from public.task_run tr
      where tr.id = task_output.task_run_id and tr.org_id = public.current_org_id()
    )
  );

drop policy if exists "task_output_insert_org" on public.task_output;
create policy "task_output_insert_org"
  on public.task_output for insert
  to authenticated
  with check (
    exists (
      select 1 from public.task_run tr
      where tr.id = task_output.task_run_id and tr.org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- guardrail_check — scoped via its parent task_run's org
-- ---------------------------------------------------------------------------
drop policy if exists "guardrail_check_select_org" on public.guardrail_check;
create policy "guardrail_check_select_org"
  on public.guardrail_check for select
  to authenticated
  using (
    exists (
      select 1 from public.task_run tr
      where tr.id = guardrail_check.task_run_id and tr.org_id = public.current_org_id()
    )
  );

drop policy if exists "guardrail_check_insert_org" on public.guardrail_check;
create policy "guardrail_check_insert_org"
  on public.guardrail_check for insert
  to authenticated
  with check (
    exists (
      select 1 from public.task_run tr
      where tr.id = guardrail_check.task_run_id and tr.org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_event — read within your org; insert allowed.
-- (Append-only DB privileges — revoke update/delete — are hardened in Step 6.)
-- ---------------------------------------------------------------------------
drop policy if exists "audit_event_select_org" on public.audit_event;
create policy "audit_event_select_org"
  on public.audit_event for select
  to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "audit_event_insert_org" on public.audit_event;
create policy "audit_event_insert_org"
  on public.audit_event for insert
  to authenticated
  with check (org_id = public.current_org_id());
