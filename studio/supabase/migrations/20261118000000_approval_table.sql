-- Chunk 2 Wave 3 - Human-approval gate (ADR-0020).
--
-- The governed-run pipeline routes any flagged run to task_run.status = 'needs_review'
-- (most-severe-wins; ADR-0014/0015), but nothing consumes that queue yet. This migration
-- adds the APPROVAL record so an org member can clear a flagged run with an attributable,
-- tamper-evident approve/reject decision. The status values ('approved'/'rejected') already
-- exist on task_status (phase-0 core schema); this adds the decision table + its flow.
--
-- Access model: ORG-SCOPED RLS via current_org_id(), scoped through the parent task_run --
-- the same pattern as guardrail_check / task_output (ADR-0009 / ADR-0003). Any authenticated
-- org member may review; self-approval is allowed in the MVP (ADR-0020). Least privilege is
-- enforced by which POLICIES exist: SELECT + INSERT only.
--
-- APPEND-ONLY: a governance decision, once made, is history. We mirror audit_event's Step-6
-- hardening -- RLS exposes no update/delete policy AND the UPDATE/DELETE privileges are revoked
-- outright, so even a future misconfigured policy could never rewrite a recorded decision.
-- A later re-review appends a NEW decision row; it never edits the old one.
--
-- current_org_id() is defined in the Step 5 RLS migration. Step 5's ALTER DEFAULT PRIVILEGES
-- already grants authenticated the table privileges on this future table, so we only enable RLS,
-- add the SELECT/INSERT policies, and revoke update/delete to lock it append-only.
--
-- SUPABASE SQL EDITOR: this migration enables RLS itself -> pick "Run without RLS".

-- ============================================================================
-- Enum
-- ============================================================================
create type approval_decision as enum ('approved', 'rejected');

-- ============================================================================
-- Table
-- ============================================================================
create table approval (
  id uuid primary key default gen_random_uuid(),
  task_run_id uuid not null references task_run (id) on delete cascade,
  decided_by uuid not null references profile (user_id),
  decision approval_decision not null,
  note text,
  created_at timestamptz not null default now()
);
comment on table approval is
  'An org member''s human-review decision on a flagged run. Append-only; the durable, '
  'attributable record behind a task_run status flip to approved/rejected. ADR-0020.';
create index approval_task_run_id_idx on approval (task_run_id);

-- ============================================================================
-- RLS - org-scoped (scoped via the parent task_run's org). Least privilege = only
-- these policies exist: SELECT + INSERT. You record your OWN decision (decided_by = you).
-- ============================================================================
alter table approval enable row level security;

drop policy if exists "approval_select_org" on public.approval;
create policy "approval_select_org"
  on public.approval for select
  to authenticated
  using (
    exists (
      select 1 from public.task_run tr
      where tr.id = approval.task_run_id and tr.org_id = public.current_org_id()
    )
  );

drop policy if exists "approval_insert_org" on public.approval;
create policy "approval_insert_org"
  on public.approval for insert
  to authenticated
  with check (
    decided_by = (select auth.uid())
    and exists (
      select 1 from public.task_run tr
      where tr.id = approval.task_run_id and tr.org_id = public.current_org_id()
    )
  );

-- ============================================================================
-- Append-only at the privilege level (mirrors audit_event, ADR-0005 / Step 6).
-- INSERT + SELECT remain (still row-scoped by the policies above).
-- ============================================================================
revoke update, delete on public.approval from authenticated;
revoke update, delete on public.approval from anon;
