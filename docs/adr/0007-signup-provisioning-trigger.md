# ADR-0007: Provision org + profile at sign-up via a SECURITY DEFINER trigger

- **Status:** Accepted
- **Date:** 2026-11-12

## Context
When a user signs up (Supabase Auth inserts into `auth.users`), the app needs to create their
**org** and their **profile** (with a role) — otherwise a logged-in user has no tenant and no
role. But [the core schema](../../studio/supabase/migrations/20261110000000_phase0_core_schema.sql)
turns on **default-deny RLS**, so an insert made with the new user's own JWT is blocked. Where
should this one-time provisioning run?

Forces in tension:
- **Security / least privilege** — provisioning needs to write under deny-all RLS, but we don't
  want the powerful service-role key scattered through app code (ADR-12 keeps data access on the
  user's JWT).
- **Atomicity** — org and profile must be created together, or neither.
- **Simplicity (YAGNI)** — a solo MVP shouldn't build an onboarding service for this.

## Decision
A Postgres **`SECURITY DEFINER` trigger** — `public.handle_new_user()` on `auth.users` (after
insert) — creates the org and profile **atomically**. The org name and display name come from
**sign-up metadata** (`raw_user_meta_data`, set via the client's `options.data`). The user is made
the org's **`accountable_leader`** (one-user-one-org, ADR-9). `search_path` is pinned to `''` per
Supabase's security guidance so the function is fully schema-qualified and can't be hijacked.

## Alternatives considered
- **Server action using the service-role key** — rejected: spreads the RLS-bypassing key into
  application code (larger blast radius), adds a second network round-trip, and isn't atomic with
  the auth insert.
- **Client-side insert after sign-up** — rejected: blocked by default-deny RLS and insecure (the
  client could set its own org/role).

## Consequences
- **Positive:** atomic, server-side, works under deny-all RLS, and **no service-role key in app
  code**; the standard, well-documented Supabase pattern.
- **Negative (the point):** provisioning logic lives in SQL (a trigger), so it's less visible to
  someone reading only the app code and must be tested at the database level; changing
  provisioning later means a new migration. Because the trigger runs *inside* the sign-up
  transaction, a provisioning failure rolls the whole sign-up back (atomic) — the user gets a
  sign-up error rather than a half-created account, which is the behaviour we want.
- **Neutral:** multi-user orgs / Frontline-Doer invites (Release 1b) will extend this (invited
  users won't create a new org). Builds on ADR-9 (org_id + RLS) and ADR-0003 (data-source layer).
