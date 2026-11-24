-- ⚠️ DO NOT MERGE. DO NOT RUN IN ANY SQL EDITOR. ⚠️
-- Red→green proof for ADR-0035 point 5 (PenTest F-17 / SR-23).
-- This deliberately reopens PenTest F-01: it gives every signed-in member UPDATE on all of task_run
-- again, so a member could set a run's status directly and skip the one-time review (ADR-0028).
-- The static check "Security — database permissions (static) · review decided once" must fail on
-- this, and the ruleset on main must block the merge. The branch is then deleted, never merged.
grant update on table public.task_run to authenticated;
