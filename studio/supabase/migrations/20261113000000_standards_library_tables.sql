-- Epic 0 — Standards library data model (ADR-0008).
--
-- Two tables that hold the baseline AI-safety rules the policy seed (Epic 1) and the
-- Governance Co-Pilot (Epic 4) build on: `standard` (the source framework) and
-- `standard_rule` (one cited, categorized rule). This migration creates the SHAPE only;
-- the rules themselves are seeded in a later migration (the content track).
--
-- Access model: a GLOBAL READ-ONLY CATALOG, exactly like `skill`. RLS is enabled with a
-- SELECT-only policy for authenticated users; there is no write policy, so inserts/updates/
-- deletes are blocked for the app even though the authenticated role holds the table grant
-- (via the Step 5 ALTER DEFAULT PRIVILEGES). The library is populated by the privileged
-- seed migration, which runs as the owner and bypasses RLS. No vector DB (Build-Plan ADR-4).

-- ============================================================================
-- Enums
-- ============================================================================
create type standard_name as enum ('nist_ai_rmf', 'eu_ai_act', 'iso_42001');
create type standard_tier as enum ('baseline', 'justice');

-- ============================================================================
-- Tables
-- ============================================================================
create table standard (
  id uuid primary key default gen_random_uuid(),
  name standard_name not null,
  version text not null,
  tier standard_tier not null default 'baseline',
  created_at timestamptz not null default now(),
  unique (name, version)
);
comment on table standard is
  'A source governance framework (NIST / EU AI Act / ISO 42001) the standards library draws from.';

create table standard_rule (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standard (id) on delete cascade,
  code text not null unique,
  rule_text text not null,
  category text not null,
  risk_tier text not null,
  citation text not null,
  created_at timestamptz not null default now()
);
comment on table standard_rule is
  'A plain-language, cited rule derived from a standard; grounds policy seeding and Co-Pilot advice. category/risk_tier are free text until Epics 1/4 settle their vocabularies (ADR-0008). No vector DB (ADR-4).';
create index standard_rule_standard_id_idx on standard_rule (standard_id);
create index standard_rule_category_idx on standard_rule (category);

-- ============================================================================
-- RLS — global read-only catalog (same pattern as `skill`)
-- ============================================================================
alter table standard enable row level security;
alter table standard_rule enable row level security;

drop policy if exists "standard_select_authenticated" on public.standard;
create policy "standard_select_authenticated"
  on public.standard for select
  to authenticated
  using (true);

drop policy if exists "standard_rule_select_authenticated" on public.standard_rule;
create policy "standard_rule_select_authenticated"
  on public.standard_rule for select
  to authenticated
  using (true);
