-- Epic 1 - Policy-seed data model (ADR-0009).
--
-- Three ORG-OWNED tables that hold an organization's own AI policy, generated from the
-- policy-seed intake and grounded in the standards library (ADR-0008):
--   policy               - the container (one rulebook per org; versioned-with-active)
--   policy_rule          - the generated rules (atomic; each cites its source standard_rule)
--   policy_seed_response - the raw intake answers (immutable record)
--
-- Access model: ORG-SCOPED RLS via current_org_id(), the task_run pattern (ADR-9 / ADR-0003) --
-- NOT the global read-only catalog pattern. Writes happen as the signed-in user at runtime.
-- LEAST PRIVILEGE is enforced by which POLICIES exist (same mechanism as the standards library):
-- only the operations we create a policy for are allowed; everything else is blocked by RLS even
-- though the authenticated role holds the table grant. So: SELECT + INSERT on all three; UPDATE on
-- policy only (status flips); NO delete, and NO update on policy_rule / policy_seed_response.
--
-- DB-level enforcement of is_baseline_safety non-overridability is DEFERRED to Release 1b
-- (there is no edit path in 1a). Reserved hooks (task_run.policy_id, guardrail_check.policy_rule_id)
-- are deferred to their consuming features (inheritance ticket / Epic 5) - not added here.
--
-- Rule text / citations are kept plain ASCII. current_org_id() is defined in the Step 5 RLS migration.
--
-- SUPABASE SQL EDITOR: this migration enables RLS itself -> pick "Run without RLS".

-- ============================================================================
-- Enums
-- ============================================================================
create type policy_status as enum ('draft', 'active', 'archived');
create type policy_rule_origin as enum ('standard', 'baseline', 'custom');

-- ============================================================================
-- Tables
-- ============================================================================
create table policy (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  name text not null,
  status policy_status not null default 'draft',
  created_at timestamptz not null default now()
);
comment on table policy is
  'An organization''s AI policy (one rulebook; versioned-with-active). ADR-0009.';
create index policy_org_id_idx on policy (org_id);
-- One ACTIVE policy per org; drafts/archived are unconstrained.
create unique index policy_one_active_per_org on policy (org_id) where status = 'active';

create table policy_rule (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policy (id) on delete cascade,
  rule_text text not null,
  standard_rule_id uuid references standard_rule (id) on delete set null,
  citation text,
  category text not null,
  risk_tier text not null,
  origin policy_rule_origin not null,
  is_baseline_safety boolean not null default false,
  needs_review boolean not null default false,
  source_question text,
  created_at timestamptz not null default now()
);
comment on table policy_rule is
  'One plain-language policy rule. Atomic: cites at most one source standard_rule (null = custom); citation is snapshotted for point-in-time provenance. category/risk_tier free text per ADR-0008. ADR-0009.';
create index policy_rule_policy_id_idx on policy_rule (policy_id);
create index policy_rule_standard_rule_id_idx on policy_rule (standard_rule_id);

create table policy_seed_response (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policy (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_by uuid not null references profile (user_id),
  created_at timestamptz not null default now()
);
comment on table policy_seed_response is
  'The raw policy-seed intake answers behind a policy; immutable (insert + read only). ADR-0009.';
create index policy_seed_response_policy_id_idx on policy_seed_response (policy_id);

-- ============================================================================
-- RLS - org-scoped (task_run pattern). Least privilege = only these policies exist.
-- ============================================================================
alter table policy enable row level security;
alter table policy_rule enable row level security;
alter table policy_seed_response enable row level security;

-- policy: read / insert / update within your org (no delete)
drop policy if exists "policy_select_org" on public.policy;
create policy "policy_select_org"
  on public.policy for select
  to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "policy_insert_org" on public.policy;
create policy "policy_insert_org"
  on public.policy for insert
  to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "policy_update_org" on public.policy;
create policy "policy_update_org"
  on public.policy for update
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- policy_rule: read / insert, scoped via the parent policy's org (no update/delete)
drop policy if exists "policy_rule_select_org" on public.policy_rule;
create policy "policy_rule_select_org"
  on public.policy_rule for select
  to authenticated
  using (
    exists (
      select 1 from public.policy p
      where p.id = policy_rule.policy_id and p.org_id = public.current_org_id()
    )
  );

drop policy if exists "policy_rule_insert_org" on public.policy_rule;
create policy "policy_rule_insert_org"
  on public.policy_rule for insert
  to authenticated
  with check (
    exists (
      select 1 from public.policy p
      where p.id = policy_rule.policy_id and p.org_id = public.current_org_id()
    )
  );

-- policy_seed_response: read / insert, scoped via the parent policy's org; author is yourself
drop policy if exists "policy_seed_response_select_org" on public.policy_seed_response;
create policy "policy_seed_response_select_org"
  on public.policy_seed_response for select
  to authenticated
  using (
    exists (
      select 1 from public.policy p
      where p.id = policy_seed_response.policy_id and p.org_id = public.current_org_id()
    )
  );

drop policy if exists "policy_seed_response_insert_org" on public.policy_seed_response;
create policy "policy_seed_response_insert_org"
  on public.policy_seed_response for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.policy p
      where p.id = policy_seed_response.policy_id and p.org_id = public.current_org_id()
    )
  );
