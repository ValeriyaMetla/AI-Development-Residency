-- Phase 0 core schema (thin slice) — Community AI Workflow Studio
--
-- Groups A (tenancy/identity), D (skills & runs), E (guardrails), F (audit) from
-- Build Plan Step 3. The richer policy & standards tables (Groups B, C) and the
-- approval / copilot_assessment / policy_suggestion tables arrive in Phase 1
-- (migrations are additive).
--
-- SECURITY NOTE: Row-Level Security is ENABLED on every table here as a safe
-- default-deny — with no policies yet, nothing is reachable through Supabase's
-- auto-generated API, so there is no exposure window between this step and Step 5.
-- The actual access policies (org isolation, role gating, skill reads, audit
-- insert-only) are added in Step 5; the append-only DB privileges on audit_event
-- are hardened in Step 6.
--
-- ADRs: 0003 (internal layering — all DB access via lib/data), 5 (mutable
-- task_run vs append-only audit_event), 6 (audit stores NO sensitive content),
-- 9 (org_id + RLS tenancy), 12 (identity via Supabase Auth); 23 (migrations in repo).

-- ============================================================================
-- Enums (fixed choice-lists)
-- ============================================================================
-- Named user_role (not "role") to avoid the SQL reserved word ROLE.
create type user_role as enum ('accountable_leader', 'frontline_doer');
create type org_tier as enum ('free', 'premium');
create type task_status as enum (
  'running',
  'blocked',
  'needs_review',
  'approved',
  'rejected',
  'completed'
);
create type skill_type as enum ('skill', 'copilot');
create type guardrail_check_type as enum ('rule_check', 'pii', 'risky_use', 'self_critique');
create type guardrail_result as enum ('pass', 'flag', 'block');

-- ============================================================================
-- Group A — Tenancy & identity
-- ============================================================================
create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier org_tier not null default 'free',
  onboarding_step integer not null default 0,
  created_at timestamptz not null default now()
);
comment on table org is 'One row per organization (tenant).';

create table profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references org (id) on delete cascade,
  role user_role not null,
  display_name text,
  created_at timestamptz not null default now()
);
comment on table profile is 'Extends Supabase auth.users with org membership and role.';
create index profile_org_id_idx on profile (org_id);

-- ============================================================================
-- Group D — Skills & runs
-- ============================================================================
create table skill (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type skill_type not null default 'skill',
  is_hero boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table skill is 'Global catalog of governed tasks (Skills and the Co-Pilot).';

create table task_run (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  skill_id uuid not null references skill (id),
  run_by uuid not null references profile (user_id),
  status task_status not null default 'running',
  input_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table task_run is
  'One run of a Skill by a person; mutable working state (ADR-5). Phase 1 adds policy_id.';
create index task_run_org_id_idx on task_run (org_id);
create index task_run_skill_id_idx on task_run (skill_id);

create table task_output (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid not null references task_run (id) on delete cascade,
  content text,
  provenance_label text,
  self_critique_result text,
  created_at timestamptz not null default now()
);
comment on table task_output is 'A run''s output, its provenance label, and self-critique result.';
create index task_output_task_run_id_idx on task_output (task_run_id);

-- ============================================================================
-- Group E — Guardrails & review
-- ============================================================================
create table guardrail_check (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid not null references task_run (id) on delete cascade,
  check_type guardrail_check_type not null,
  result guardrail_result not null,
  reason_plain text,
  created_at timestamptz not null default now()
);
comment on table guardrail_check is 'One guardrail check on a run. Phase 1 adds policy_rule_id.';
create index guardrail_check_task_run_id_idx on guardrail_check (task_run_id);

-- ============================================================================
-- Group F — Registry & audit (append-only; privileges hardened in Step 6)
-- ============================================================================
create table audit_event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  task_run_id uuid references task_run (id) on delete set null,
  actor uuid references profile (user_id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table audit_event is
  'Append-only event log (ADR-5). payload holds NO sensitive content (ADR-6).';
create index audit_event_org_id_idx on audit_event (org_id);
create index audit_event_task_run_id_idx on audit_event (task_run_id);

-- ============================================================================
-- Default-deny RLS — enabled now; access POLICIES are added in Step 5
-- ============================================================================
alter table org enable row level security;
alter table profile enable row level security;
alter table skill enable row level security;
alter table task_run enable row level security;
alter table task_output enable row level security;
alter table guardrail_check enable row level security;
alter table audit_event enable row level security;
