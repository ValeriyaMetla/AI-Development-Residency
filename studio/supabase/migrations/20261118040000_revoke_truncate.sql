-- Security hardening — remove TRUNCATE from the app roles on every public table.
--
-- WHY: Supabase's default setup grants ALL privileges, TRUNCATE included, to anon and
-- authenticated on tables in public. Our migrations only granted select/insert/update/delete
-- (20261112010000_rls_policies.sql) and, for the append-only tables, revoked UPDATE + DELETE
-- (20261112020000_audit_append_only.sql, then approval / run_correction). TRUNCATE was never
-- revoked, and it IGNORES row-level security: it would wipe a whole table across every org.
-- A live check on 2026-11-18 confirmed both anon and authenticated held TRUNCATE on audit_event.
--
-- Risk today is low — the app reaches the DB only through the Supabase data API, which cannot
-- issue TRUNCATE, and there is no .rpc() or dynamic SQL — but it breaks the append-only promise
-- (ADR-5: history can never be erased by an app user) and would open up the moment any raw-SQL
-- path appeared. (ADR-5 here is the Build Plan's numbering, as in the core-schema migration — not
-- docs/adr/0005.) No app code needs TRUNCATE. The admin path is unaffected: postgres /
-- service_role keep it.
--
-- Two parts:
--   1. Revoke on every EXISTING table in public (covers audit_event, approval, run_correction,
--      task_run, policy, ... — all of them, so no table is missed).
--   2. Change the DEFAULT privileges so tables created LATER don't get TRUNCATE either. Tables
--      created from the SQL Editor are owned by postgres, so it's postgres's defaults that matter.
--
-- Revokes are idempotent — safe to re-run. Run in the Supabase SQL Editor with "Run without RLS".

revoke truncate on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate on tables from anon, authenticated;
