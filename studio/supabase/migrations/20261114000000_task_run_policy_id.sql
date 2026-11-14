-- Epic 1 - Policy inheritance (ADR-0009 reserved hook).
--
-- Adds the task_run -> policy link the core schema reserved ("Phase 1 adds policy_id").
-- Every governed run is stamped with the org's ACTIVE policy at run time, so each run
-- records which policy governed it, and later assessments inherit the active policy.
--
-- Nullable + ON DELETE SET NULL: a run may predate any policy, and archiving/replacing a
-- policy must never delete run history (keep the audit trail). task_run already has
-- org-scoped RLS (Step 5); this column needs no new policy. This is an additive ALTER and
-- does NOT enable RLS, so it can be run normally in the Supabase SQL Editor.

alter table task_run
  add column policy_id uuid references policy (id) on delete set null;

create index task_run_policy_id_idx on task_run (policy_id);

comment on column task_run.policy_id is
  'The org active policy in force when this run was created (policy inheritance, Epic 1 / ADR-0009).';
