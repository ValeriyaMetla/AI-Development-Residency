-- Epic 4 - Governance Co-Pilot data model (ADR-0010).
--
-- One ORG-OWNED table holding a Co-Pilot risk assessment. A Co-Pilot assessment runs through
-- the governed-run pipeline, so it IS a task_run (the `copilot` skill) PLUS this immutable child
-- that carries the structured recommendation -- exactly as task_output is to a Skill run.
--
-- Access model: ORG-SCOPED RLS via the parent task_run (the task_output pattern, ADR-9 / ADR-0003).
-- LEAST PRIVILEGE by which POLICIES exist: SELECT + INSERT only. An assessment is an IMMUTABLE
-- record -- re-asking creates a new task_run + copilot_assessment (non-destructive), so there is NO
-- update and NO delete policy. The recommendation object is stored as jsonb (point-in-time snapshot;
-- signals are yes/no and reasons are categorical, so it holds no raw sensitive content -- ADR-6).
--
-- current_org_id() is defined in the Step 5 RLS migration. Plain ASCII throughout.
--
-- SUPABASE SQL EDITOR: this migration enables RLS itself -> pick "Run without RLS".

-- ============================================================================
-- Enums (the Co-Pilot's verdict + the EU-AI-Act-aligned risk tiers, ADR-0010)
-- ============================================================================
create type copilot_verdict as enum ('use', 'use_with_conditions', 'dont', 'out_of_scope');
create type copilot_tier as enum ('minimal', 'limited', 'high', 'prohibited', 'undetermined');

-- ============================================================================
-- The `copilot` Skill (global catalog row; the assessment's task_run points at it)
-- ============================================================================
insert into skill (key, name, type, is_hero)
values ('governance_copilot', 'Governance Co-Pilot', 'copilot', true)
on conflict (key) do nothing;

-- ============================================================================
-- Table
-- ============================================================================
create table copilot_assessment (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid not null references task_run (id) on delete cascade,
  verdict copilot_verdict not null,
  tier copilot_tier not null,
  -- The structured recommendation (ADR-0010 / design spec §5.2): signals[], reasons[] with
  -- code-attached citations, baselineRules[], saferWay, tierLabel, summary.
  recommendation jsonb not null default '{}'::jsonb,
  -- Which active policy was in force (provenance snapshot); null = no active policy at the time.
  policy_id uuid references policy (id) on delete set null,
  provenance_label text,
  human_decision_required boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table copilot_assessment is
  'One Governance Co-Pilot risk assessment; immutable child of its task_run (the copilot skill). verdict/tier are deterministic (ADR-0010); recommendation jsonb holds no raw sensitive content (ADR-6).';
create index copilot_assessment_task_run_id_idx on copilot_assessment (task_run_id);
create index copilot_assessment_policy_id_idx on copilot_assessment (policy_id);

-- ============================================================================
-- RLS - org-scoped via the parent task_run (task_output pattern). SELECT + INSERT only.
-- ============================================================================
alter table copilot_assessment enable row level security;

drop policy if exists "copilot_assessment_select_org" on public.copilot_assessment;
create policy "copilot_assessment_select_org"
  on public.copilot_assessment for select
  to authenticated
  using (
    exists (
      select 1 from public.task_run tr
      where tr.id = copilot_assessment.task_run_id and tr.org_id = public.current_org_id()
    )
  );

drop policy if exists "copilot_assessment_insert_org" on public.copilot_assessment;
create policy "copilot_assessment_insert_org"
  on public.copilot_assessment for insert
  to authenticated
  with check (
    exists (
      select 1 from public.task_run tr
      where tr.id = copilot_assessment.task_run_id and tr.org_id = public.current_org_id()
    )
  );
