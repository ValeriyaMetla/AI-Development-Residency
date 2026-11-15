# ADR-0013: Use Supabase for database, auth, and row-level security

## Date and status
November 14, 2026. Accepted.

## Context
A governance tool is only as trustworthy as its record, and it is multi-tenant: every org's policy,
runs, and audit log must be isolated so one org can never read another's data. We also need
authentication with roles (Accountable Leader, Frontline Doer) and a relational store with
provenance links — without a solo builder running a database.

## Options
- Supabase (managed Postgres + Auth + Row-Level Security):
  - Good: tenancy enforced at the database with RLS (defense in depth); auth and roles built in;
    relational integrity with provenance foreign keys; version-controlled SQL migrations; an
    append-only audit log; free tier; room for pgvector later.
  - Bad: RLS policies are easy to get subtly wrong (need explicit tests and review); managed-platform
    lock-in; the service-role key is a high-blast-radius secret that must stay server-only.
- Raw Postgres (AWS RDS / Neon) + a separate auth provider (Auth0 / Clerk):
  - Good: flexible, swappable pieces.
  - Bad: more services to wire together and more configuration for a solo MVP.
- A NoSQL store (Firebase / MongoDB):
  - Good: quick to start.
  - Bad: the data is relational with provenance links; per-row tenancy and migrations fit SQL better.
- App-layer-only tenancy (no RLS):
  - Good: simpler to write at first.
  - Bad: a single missed check leaks cross-org data — no database safety net.

## Decision
Use **Supabase**: managed Postgres for data, Supabase Auth for identity and roles, and **default-deny
Row-Level Security** on every org-scoped table keyed on `current_org_id()` (the policy / `task_run`
pattern, ADR-0007/0009). Access uses the user's own JWT so RLS enforces isolation (ADR-12); the
service-role key is reserved for narrow server-only paths and never shipped to the client. Schema
changes are version-controlled migrations in the repo; the audit log is append-only at the
DB-privilege level.

## Consequences
Easier: org isolation enforced at the database (proven by RLS tenancy tests); auth and roles out of
the box; relational integrity and provenance; version-controlled migrations; free for the MVP.
Harder: RLS needs careful tests and review (coverage is prioritized there), managed-platform
lock-in, and the service-role key must be guarded as server-only. Next: write the RLS tenancy tests
(org B cannot read org A).
