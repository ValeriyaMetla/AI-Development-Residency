-- Step 6 — Make the audit log append-only at the DB privilege level (ADR-19).
--
-- audit_event is the product's tamper-evident record. The Step 5 RLS policies already
-- allow only INSERT + SELECT (no update/delete policy), so app users can't modify it.
-- This goes one level deeper: it REVOKES the UPDATE and DELETE privileges outright, so
-- even a future misconfigured RLS policy could never re-open editing or deletion of
-- history. INSERT + SELECT remain (still row-scoped by the Step 5 policies).
--
-- The admin path is unaffected: deleting an org cascades its audit rows, because that
-- runs as a privileged role (postgres / service_role), not as authenticated / anon.
--
-- Note: Step 5's ALTER DEFAULT PRIVILEGES grants update/delete on *future* tables to
-- authenticated; audit_event already exists, so revoking here is sufficient and durable.
-- Revokes are idempotent, so this migration is safe to re-run.

revoke update, delete on public.audit_event from authenticated;
revoke update, delete on public.audit_event from anon;
