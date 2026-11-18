-- Chunk 3 - Entry-correction / note flow (ADR-0021).
--
-- The Registry view lets a person READ their own governed-run record (/dashboard/usage/mine).
-- This migration adds the one write action: a person can annotate their OWN run when it is wrong
-- or needs context. The run record itself is immutable (task_run / task_output / guardrail_check /
-- audit_event are append-only, ADR-0005 / Step 6), so a correction is NOT an edit -- it is a new
-- row recorded ALONGSIDE the run. The original is never touched.
--
-- Access model: OWN-RUNS-ONLY. SELECT is org-scoped via the parent task_run (same pattern as
-- approval / guardrail_check / task_output, ADR-0003 / ADR-0020), so the person and their org can
-- see it. INSERT is tighter than approval: you may only annotate a run YOU ran -- created_by must
-- be you AND the parent task_run.run_by must be you. A correction never flips task_run.status; the
-- run's lifecycle belongs to the pipeline, a correction is commentary beside it.
--
-- APPEND-ONLY: a recorded correction is history. We mirror audit_event / approval -- no UPDATE or
-- DELETE policy AND the UPDATE/DELETE privileges are revoked, so even a future misconfigured policy
-- could never rewrite a note. A mistake is fixed by appending another correction.
--
-- current_org_id() is defined in the Step 5 RLS migration. Step 5's ALTER DEFAULT PRIVILEGES
-- already grants authenticated the table privileges on this future table, so we only enable RLS,
-- add the SELECT/INSERT policies, and revoke update/delete to lock it append-only.
--
-- SUPABASE SQL EDITOR: this migration enables RLS itself -> pick "Run without RLS".

-- ============================================================================
-- Enum
-- ============================================================================
create type correction_kind as enum ('correction', 'note');

-- ============================================================================
-- Table
-- ============================================================================
create table run_correction (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid not null references task_run (id) on delete cascade,
  created_by uuid not null references profile (user_id),
  kind correction_kind not null,
  note text not null,
  created_at timestamptz not null default now()
);
comment on table run_correction is
  'A person''s additive annotation on their OWN run -- a correction (the record is inaccurate) or '
  'a note (added context). Append-only; recorded ALONGSIDE the immutable run, never an edit of it. '
  'Does not change task_run.status. ADR-0021.';
create index run_correction_task_run_id_idx on run_correction (task_run_id);

-- ============================================================================
-- RLS - SELECT org-scoped (via the parent task_run's org); INSERT own-runs-only
-- (you annotate a run you ran, as yourself). Least privilege = only these two policies exist.
-- ============================================================================
alter table run_correction enable row level security;

drop policy if exists "run_correction_select_org" on public.run_correction;
create policy "run_correction_select_org"
  on public.run_correction for select
  to authenticated
  using (
    exists (
      select 1 from public.task_run tr
      where tr.id = run_correction.task_run_id and tr.org_id = public.current_org_id()
    )
  );

drop policy if exists "run_correction_insert_own" on public.run_correction;
create policy "run_correction_insert_own"
  on public.run_correction for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.task_run tr
      where tr.id = run_correction.task_run_id
        and tr.org_id = public.current_org_id()
        and tr.run_by = (select auth.uid())
    )
  );

-- ============================================================================
-- Append-only at the privilege level (mirrors audit_event / approval, ADR-0005 / ADR-0020).
-- INSERT + SELECT remain (still row-scoped by the policies above).
-- ============================================================================
revoke update, delete on public.run_correction from authenticated;
revoke update, delete on public.run_correction from anon;
