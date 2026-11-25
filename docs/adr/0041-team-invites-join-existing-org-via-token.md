# ADR-0041: Team invites — join an existing org via a hashed single-use token consumed by the invite-aware sign-up trigger

- **Status:** Proposed
- **Date:** 2026-11-25

## Context
The schema already models multiple users per org: [`profile`](../../studio/supabase/migrations/20261110000000_phase0_core_schema.sql)
carries `org_id` + a `role` enum whose values are `accountable_leader` and `frontline_doer`, and
all task/audit data is isolated by org via RLS (`current_org_id()`). The one missing piece is a way
to **join an existing org**: every new auth user runs the `handle_new_user` trigger, which always
creates a *new* org and makes the user its `accountable_leader` (ADR-0007). So a leader cannot add a
teammate, and the public copy that promises team use isn't yet true.

Forces in tension:
- **Reuse vs. a new path** — tenancy, roles, and RLS exist; only the "second person joins" path is
  missing. We want to add it without reworking what already works.
- **Security / least privilege** — an invite must not let anyone escalate to `accountable_leader`,
  invite into another org, enumerate accounts, or reuse a link. The accepting user still signs up
  under default-deny RLS, so the join must happen in trusted server code.
- **Atomicity** — like today's provisioning, a joined profile must be created together with the auth
  user, or not at all, with no window where the user has no profile.
- **Simplicity (YAGNI)** — a solo-to-small-team MVP shouldn't build a membership service; it should
  follow the existing "protected `SECURITY DEFINER` function" pattern (ADR-0028, 0030, 0031, 0039).

## Decision
- Add an org-owned **`org_invite`** table (`org_id`, `email`, `role`, `token_hash`, `expires_at`,
  `consumed_at`, `created_by`, `created_at`) with **RLS enabled and no policies** (deny-all) — it is
  reachable only through protected functions, the same posture as `audit_event`.
- **Creation / revocation go through leader-only protected functions.** `create_org_invite(email,
  role)` checks the caller is the `accountable_leader` of their own org, **forces `role =
  frontline_doer`**, rate-limits per org (reusing the signup/AI-request counter pattern of ADR-0030 /
  ADR-0034), stores only a **hashed** 256-bit random token, and returns the raw token once for the
  email link. `revoke_org_invite(id)` invalidates a pending invite.
- **Acceptance is consumed inside the sign-up trigger.** Extend `handle_new_user` (ADR-0007) to be
  invite-aware: when sign-up metadata carries a token that is valid, unexpired, unconsumed, and
  **bound to the signing-up email**, create the profile **joined to that org** as `frontline_doer`
  and mark the invite consumed — **no new org**. With no/invalid token, behaviour is exactly as
  today (new org + `accountable_leader`).
- Add an RLS policy so an `accountable_leader` can read `profile` rows **within their own org** (for
  the Team page); existing own-row reads for everyone else stay.

## Alternatives considered
- **A separate `accept_invite` RPC called after sign-up** (trigger creates nothing for invited
  users) — rejected: provisioning would live in two places and risk a window where the authenticated
  user has no profile; consuming the token inside the existing atomic trigger is simpler and
  preserves ADR-0007's "org and profile together, or neither" guarantee.
- **Supabase `inviteUserByEmail` admin API as the primary path** — rejected: it couples org-join to
  Supabase's invite semantics and *still* needs the trigger to skip creating a new org. Owning the
  token keeps the join logic in our code, testable at the database level with no email or UI.
- **Plaintext token column** — rejected: a single table read would leak live, usable invite links
  (secure-coding A08). Only the hash is stored; the raw token lives only in the emailed link.
- **Allowing the inviter to choose any role** — rejected: forcing `frontline_doer` removes a
  privilege-escalation path; promoting a doer to leader is a separate, later decision.

## Consequences
- **Positive:** makes the team promises literally true; reuses the existing tenancy/RLS/roles;
  sensitive mutations stay behind protected `SECURITY DEFINER` functions (house pattern); the core
  (table, functions, trigger) is fully testable at the database level with no UI and no email, so the
  riskiest change can be proven first.
- **Negative (the point):** this changes **auth-critical `SECURITY DEFINER` trigger code** — the most
  delicate edit in the repo. A bug could misroute a normal sign-up or over-grant an invite, so it must
  be covered by database-level tests and the static permission checks that block merges (ADR-0035). A
  leaked-but-unexpired link is usable until it expires — mitigated by email-binding, a short TTL, and
  leader revoke, but not eliminated. Invites are useless until deliverable email exists (the
  "Configure custom SMTP for auth emails" card is a hard prerequisite for the end-to-end feature).
- **Neutral:** invited users are always `frontline_doer`; promoting to leader is out of scope and
  would need its own ADR. Task data stays org-scoped (every member sees the org's runs); the finer
  "leader sees all / doer sees own" split noted in the RLS migration remains a separate, optional
  follow-up. Supersedes nothing — this **extends** ADR-0007 (which anticipated it) and builds on
  ADR-0003 (layering), ADR-0009 (org-owned data model), and ADR-0013 (Supabase auth + RLS).
