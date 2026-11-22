-- Only an Accountable Leader changes the policy; activation is one protected step
-- (ADR-0031 · PenTest F-03, F-18 · SR-04, SR-14).
--
-- WHY: the rule `policy_update_org` let any member change any of their org's policies to any status,
-- so a Frontline Doer could switch the active policy through the Data API (F-03). Activation was two
-- separate writes from the app (archive, then activate), so a failed second step left the org with no
-- active policy while reporting success (F-18). The insert rules also let any member add a rule to the
-- org's ACTIVE policy, whose text the AI reads (found while fixing; not a tested finding).
--
-- WHAT THIS DOES:
--   1. `current_user_is_leader()` — one leader check, reused below.
--   2. `activate_policy(p_policy_id)` — the ONLY way to make a policy active: leader, own org, a draft
--      with rules; archives the old one and activates the new one in one transaction.
--   3. `discard_draft_policies()` — the ONLY way to archive drafts ("start over"): leader only.
--   4. Members lose UPDATE on `policy`.
--   5. Inserts into policy, policy_rule and policy_seed_response become leader-only, and rules can only
--      be added to a draft.
--
-- THE APP CHANGE (PR B) MERGES ONLY AFTER THIS IS ON studio-pentest AND live: once members lose UPDATE
-- on `policy`, the old two-write activatePolicy stops working.
--
-- HOW TO APPLY: Supabase → SQL Editor → paste → Run → choose "Run without RLS".
-- studio-pentest first, then live. Then run supabase/checks/policy-integrity-check.sql on each.
-- PRE-CHECK (read-only): each org has at most one active policy; note how many drafts exist.
--
-- TO UNDO (if ever needed, before PR B merges): drop the three functions; drop the three
-- *_leader* insert rules; re-create policy_update_org, policy_insert_org, policy_rule_insert_org and
-- policy_seed_response_insert_org exactly as in 20261113020000_policy_seed_tables.sql; and
-- `grant update on public.policy to authenticated;`.

-- ---------------------------------------------------------------------------
-- 1. One leader check
-- ---------------------------------------------------------------------------
-- Reads the caller's OWN profile. security definer + pinned search_path, like current_org_id(), so a
-- rule on profile can't loop. Members can't change their own role: profile has a read rule only.
create or replace function public.current_user_is_leader()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profile
    where user_id = (select auth.uid()) and role = 'accountable_leader'
  );
$$;

comment on function public.current_user_is_leader() is
  'True when the signed-in user is an Accountable Leader. Used by policy rules and functions. ADR-0031.';

revoke all on function public.current_user_is_leader() from public, anon;
grant execute on function public.current_user_is_leader() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The protected activation step
-- ---------------------------------------------------------------------------
-- Runs with elevated rights (security definer), so it bypasses RLS and MUST repeat every check
-- itself. search_path is pinned so no one can shadow a table or function name.
-- Returns a plain outcome instead of raising database error text:
--   'ok' · 'not_signed_in' · 'not_leader' · 'not_found' · 'not_draft' · 'no_rules'
-- Any error rolls back both writes, so the previous active policy stays active (F-18).
create or replace function public.activate_policy(p_policy_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_status public.policy_status;
begin
  if v_uid is null then
    return 'not_signed_in';
  end if;
  if not public.current_user_is_leader() then
    return 'not_leader';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'not_found';
  end if;

  -- One activation at a time per org, so two leaders can't switch policies at the same moment.
  perform pg_advisory_xact_lock(hashtextextended('policy:' || v_org::text, 0));

  -- Another org's policy is reported exactly like a missing one (no hint that it exists).
  select p.status
    into v_status
    from public.policy p
   where p.id = p_policy_id
     and p.org_id = v_org
   for update;
  if not found then
    return 'not_found';
  end if;

  -- Only a draft can be activated: an archived version is republished as a new one (ADR-0024).
  if v_status <> 'draft' then
    return 'not_draft';
  end if;

  -- A policy with no rules would leave the org governed by nothing.
  if not exists (select 1 from public.policy_rule r where r.policy_id = p_policy_id) then
    return 'no_rules';
  end if;

  -- Archive the old active policy, then activate the new one — both or neither.
  update public.policy
     set status = 'archived'
   where org_id = v_org
     and status = 'active';

  update public.policy
     set status = 'active'
   where id = p_policy_id;

  return 'ok';
end;
$$;

comment on function public.activate_policy(uuid) is
  'The only way to make a policy active: leader, own org, a draft with rules; archives the old active '
  'policy and activates the new one in one transaction. ADR-0031.';

revoke all on function public.activate_policy(uuid) from public, anon;
grant execute on function public.activate_policy(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. The protected "start over" step
-- ---------------------------------------------------------------------------
-- Archives (never deletes) every draft in the caller's org. Returns 'ok' · 'not_signed_in' ·
-- 'not_leader' · 'not_found'.
create or replace function public.discard_draft_policies()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then
    return 'not_signed_in';
  end if;
  if not public.current_user_is_leader() then
    return 'not_leader';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'not_found';
  end if;

  update public.policy
     set status = 'archived'
   where org_id = v_org
     and status = 'draft';

  return 'ok';
end;
$$;

comment on function public.discard_draft_policies() is
  'The only way to discard draft policies: leader only, own org, drafts archived (never deleted). ADR-0031.';

revoke all on function public.discard_draft_policies() from public, anon;
grant execute on function public.discard_draft_policies() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Members can't change a policy directly
-- ---------------------------------------------------------------------------
drop policy if exists "policy_update_org" on public.policy;
revoke update on public.policy from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. Only a leader creates policies and rules, and rules go only into a draft
-- ---------------------------------------------------------------------------
-- Every app path that writes these (generate, publish an edit, publish an import) is leader-only and
-- creates a draft first, so nothing legitimate changes. Read rules are unchanged.
drop policy if exists "policy_insert_org" on public.policy;
drop policy if exists "policy_insert_leader" on public.policy;
create policy "policy_insert_leader"
  on public.policy for insert
  to authenticated
  with check (
    org_id = public.current_org_id()
    and public.current_user_is_leader()
  );

drop policy if exists "policy_rule_insert_org" on public.policy_rule;
drop policy if exists "policy_rule_insert_leader_draft" on public.policy_rule;
create policy "policy_rule_insert_leader_draft"
  on public.policy_rule for insert
  to authenticated
  with check (
    public.current_user_is_leader()
    and exists (
      select 1 from public.policy p
      where p.id = policy_rule.policy_id
        and p.org_id = public.current_org_id()
        and p.status = 'draft'
    )
  );

drop policy if exists "policy_seed_response_insert_org" on public.policy_seed_response;
drop policy if exists "policy_seed_response_insert_leader" on public.policy_seed_response;
create policy "policy_seed_response_insert_leader"
  on public.policy_seed_response for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and public.current_user_is_leader()
    and exists (
      select 1 from public.policy p
      where p.id = policy_seed_response.policy_id and p.org_id = public.current_org_id()
    )
  );
