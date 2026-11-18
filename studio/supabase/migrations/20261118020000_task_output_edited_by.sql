-- Chunk 2 Wave 3 card 3 - Reviewer editing + provenance on edit (ADR-0022).
--
-- A reviewer may edit a flagged draft before approving. An edit is saved as a NEW task_output row
-- (append, never overwrite), so the AI's original output is preserved alongside the human-edited
-- version -- the honest "what the AI made vs what the human changed" record. This adds the column
-- that marks who edited a version; the CURRENT output for a run is its most recent row.
--
-- edited_by: null = the AI's original draft; set = the person who authored this edited version.
--
-- task_output stays APPEND-ONLY (still no UPDATE/DELETE policy). We only tighten the existing
-- INSERT policy so a human-edited row must be authored by the caller (edited_by = auth.uid()),
-- in addition to the existing org scope via the parent task_run. The AI-original insert path
-- (edited_by null) is unchanged.
--
-- current_org_id() is defined in the Step 5 RLS migration. This migration does NOT enable RLS on a
-- new table (task_output already has RLS); it alters a column + replaces one policy.
--
-- SUPABASE SQL EDITOR: this migration contains policy statements -> pick "Run without RLS" so the
-- editor runs the script as written (don't let it re-wrap RLS).

-- ============================================================================
-- Column: who edited this output version (null = AI original)
-- ============================================================================
alter table task_output
  add column edited_by uuid references profile (user_id);
comment on column task_output.edited_by is
  'Null = the AI''s original draft. Set = the person who authored this human-edited version '
  '(ADR-0022). The current output for a run is its most recent row.';
create index task_output_edited_by_idx on task_output (edited_by);

-- ============================================================================
-- Tighten the INSERT policy: still org-scoped via the parent run, AND a human-edited
-- row must be authored by the caller. AI-original rows (edited_by null) are unaffected.
-- ============================================================================
drop policy if exists "task_output_insert_org" on public.task_output;
create policy "task_output_insert_org"
  on public.task_output for insert
  to authenticated
  with check (
    (edited_by is null or edited_by = (select auth.uid()))
    and exists (
      select 1 from public.task_run tr
      where tr.id = task_output.task_run_id and tr.org_id = public.current_org_id()
    )
  );
