-- Audit insert integrity (ADR-0026, Epic #7 card "Ensure audit entries can't be silently altered").
--
-- Editing, deleting and clearing audit entries is already blocked for app users
-- (20261112020000_audit_append_only, 20261118040000_revoke_truncate). ADDING entries was not:
-- the insert policy only checked org_id, and every column was writable. A signed-in member could
-- backdate an entry, credit it to a colleague, attach it to another org's run, or invent an
-- event kind. This migration closes those four paths at the database level:
--
--   1. The database stamps id + created_at: app users may insert only the other columns.
--   2. actor must be the signed-in user; task_run_id must be blank or a run in the caller's org.
--   3. event_type must be one of the 11 known kinds (new rows only — history is not rewritten).
--   4. Same id + created_at protection for approval and run_correction (ADR-0020 / ADR-0021).
--
-- REFUSE, never silently correct: a write that supplies a forbidden column or value fails
-- ("permission denied" / "violates row-level security policy" / "violates check constraint").
-- Every current writer already omits id + created_at and passes the session user as actor
-- (checked in code 2026-11-18), so no app code changes.
--
-- The admin path is unaffected: postgres / service_role are not authenticated / anon.
-- Idempotent: safe to re-run. Apply in the Supabase SQL Editor with "Run without RLS".
-- Verify afterwards with studio/supabase/checks/audit-integrity-check.sql.

-- ---------------------------------------------------------------------------
-- 1. Column-level insert: the database owns id + created_at.
--    A table-level INSERT grant would override column grants, so revoke it first, then grant
--    INSERT on exactly the columns a writer may supply. Defaults fill id + created_at.
-- ---------------------------------------------------------------------------
revoke insert on public.audit_event from authenticated, anon;
grant insert (org_id, task_run_id, actor, event_type, payload)
  on public.audit_event to authenticated;

revoke insert on public.approval from authenticated, anon;
grant insert (task_run_id, decided_by, decision, note)
  on public.approval to authenticated;

revoke insert on public.run_correction from authenticated, anon;
grant insert (task_run_id, created_by, kind, note)
  on public.run_correction to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Insert policy: own org, credited to yourself, about your own org's runs.
--    Mirrors approval_insert_own / run_correction's insert policy. A null actor fails
--    (null = auth.uid() is not true).
-- ---------------------------------------------------------------------------
drop policy if exists "audit_event_insert_org" on public.audit_event;
create policy "audit_event_insert_org"
  on public.audit_event for insert
  to authenticated
  with check (
    org_id = public.current_org_id()
    and actor = (select auth.uid())
    and (
      task_run_id is null
      or exists (
        select 1 from public.task_run tr
        where tr.id = audit_event.task_run_id
          and tr.org_id = public.current_org_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Known event kinds only. NOT VALID = enforced for every new row, existing rows untouched
--    (append-only history is never rewritten, and an unexpected old row can't fail the apply).
--    This list must match AUDIT_EVENT_TYPES in studio/lib/domain/audit-events.ts — a static
--    test fails if they drift. Adding a kind = a new migration that replaces this constraint.
-- ---------------------------------------------------------------------------
alter table public.audit_event drop constraint if exists audit_event_known_type;
alter table public.audit_event
  add constraint audit_event_known_type check (
    event_type in (
      'pii_stripped',
      'pii_kept',
      'risky_use_flagged',
      'task_blocked',
      'task_completed',
      'task_approved',
      'task_rejected',
      'task_run_corrected',
      'copilot_assessed',
      'policy_seeded',
      'policy_edited'
    )
  ) not valid;
