# ADR-0040: Failed sign-ins and refused access are logged as structured server-side security events (no new table)

- **Status:** Accepted
- **Date:** 2026-11-24
- **Relates to:** ADR-0037 (login lockout — the failed-login point this logs at; reuses its
  SHA-256-of-email basis for a non-PII reference). ADR-0026 / ADR-0039 (the governance
  `audit_event` trail — deliberately **not** reused here). ADR-0012 (serverless, no service-role
  key). ADR-0034 (the sign-up per-IP refusal this also logs).

## Context

The Week 6 PenTest found **F-22 (P3, Partial): no alerting on attacks, and the app keeps no auth
audit log of its own.** Failed logins and refused access *do* appear in Supabase's platform logs
(the test caught a `403 … 42501 row-level-security` denial), but nothing alerts anyone, "Write
audit logs to the database" is off, Free-plan log retention is short, and **the app writes no
security-event log of its own.**

**SR-18** (priority *Should*): log every failed sign-in and refused access with **time, account and
action**, never logging passwords, tokens or personal data. **R14** decision: **Fix + Accept** — the
app logs these events; **alerting and log export need a paid plan (accepted and deferred).**

Forces in tension:

- A **failed sign-in is pre-login** — no user, org or session, only the typed email and client IP,
  both personal data. The reference stored must not be personal data (SR-18).
- The governance **`audit_event`** table (ADR-0026 / 0039) is org-scoped, written only by the server
  step that performed the action, and Stream C is tightening it (F-14). Auth events have no org/user
  pre-login and are not governance actions — a wrong and risky fit.
- **Serverless, no service-role key** (ADR-0012): a bespoke database log would need an
  `anon`-callable `security definer` function plus an RLS lockdown (the ADR-0037 pattern) — real cost
  for a P3 *Should*.
- **The platform already captures these events.** The gap R14 names is specifically that the *app*
  records nothing of its own.
- **MVP / YAGNI:** prefer the fewest moving parts that close the named gap.

## Decision

**The app emits its own structured, PII-safe security-event line at each failed-sign-in and
refused-access point, through one small helper. No table, no migration.**

1. **One helper `logSecurityEvent(event)`** (`lib/security/security-log.ts`, server-only) writes a
   single structured line — `console.warn('[security]', JSON.stringify({ t, event, action, ref,
   outcome }))` — to the server log (Vercel / Supabase function logs).
2. **Fields:** `t` (ISO time), `event` (`login_failed` · `login_blocked` · `access_refused`),
   `action` (what was attempted — `signin`, `signup`, `password_update`, …), `ref` (a non-PII
   account reference, point 3), `outcome` (`wrong_password` · `locked` · `rate_limited` ·
   `no_session` · …). **Never** the password, token, raw email, raw IP, or request payload.
3. **The account reference is privacy-preserving:**
   - *Pre-login (failed sign-in, sign-up):* `emailRef(email)` = `'e:'` + the first 12 hex characters
     of the SHA-256 hash of the lowercased, trimmed email (same basis as ADR-0037's lockout),
     computed app-side (Node `crypto`). Repeated attempts on one account correlate without storing
     the email.
   - *Authenticated refusal:* `userRef(auth.uid())` — the pseudonymous user id (and org id where
     useful), never names or emails.
4. **Logged events — this change (Stream A's auth surface, `app/auth/actions.ts`):**
   - **Failed sign-ins:** a wrong password (`login_failed`) and a lockout block (`login_blocked`),
     in the login action.
   - **Sign-up abuse:** the per-IP sign-up rate-limit refusal (`access_refused` / `rate_limited`).
   - **Password-reset refusal:** setting a new password with no valid recovery session
     (`access_refused` / `no_session`).
   - **Not** the ordinary "not logged in → `/login`" redirect — it is not an attack signal and would
     be noise.
5. **Follow-up (same helper, handlers owned by other streams):** the in-app privileged refusals —
   leader-only policy refusals, AI rate-limit refusals, and RLS-denied writes — live in Stream B/C's
   files. The helper is written to be called from anywhere; wiring those points is deferred to the
   owning stream so this change stays within auth-surface file ownership.
6. **Best-effort, never throws:** a logging failure must never block or change a request's outcome
   (the same principle as ADR-0037's record path).

## Alternatives considered

- **A dedicated `security_event` database table.** Durable and queryable, surviving Free-plan
  retention — but needs a migration, an `anon`-callable `security definer` function and an RLS
  lockdown, it duplicates the platform logs, and R14 already accepts leaning on those plus paid-plan
  export. **Deferred;** revisit if durable retention and alerting are funded.
- **Reusing `audit_event`.** Rejected: org-scoped governance actions written by the acting step
  (ADR-0026 / 0039); auth events have no org/user pre-login and don't belong there, and Stream C is
  locking it down.
- **Logging the raw email / IP** for richer forensics. Rejected: personal data; a hash prefix
  correlates attacks without storing PII (SR-18).

## Consequences

- **Positive:** the app now leaves its own PII-safe trace of failed logins and refused access
  (closes the named gap), with no schema, no migration, and one readable helper. Events correlate by
  hashed reference without storing PII.
- **Negative (accepted):** retention is only as long as the platform keeps logs (short on Free),
  there is no alerting, and logs are not exported — all accepted by R14 pending a paid plan, so a
  trace may expire before anyone reviews it. Server logs are not queryable like a table, so forensic
  search is manual until export is funded.
- **Negative (accepted):** only the auth surface is wired in this change; the in-app privileged
  refusals (point 5) are a documented follow-up, so until they are wired an RLS-denied write is
  traced only by the platform log, not the app.
- **Neutral:** turning on Supabase's "Write audit logs to the database" is a separate settings item
  (R14), owned with the other settings toggles.

## Proof

- **Unit tests** (`test/security-log.test.ts`): `emailRef` is deterministic, case/whitespace
  insensitive, prefixed `e:`, and **never contains the raw email**; `logSecurityEvent` emits the
  expected structured shape and never the raw email / password / token / IP; it never throws even
  when `console.warn` itself throws. Break-it: feed a raw email and assert it never appears in the
  emitted line.
- **Wiring tests** (`test/login-action.test.ts`): the login action logs `login_blocked` on a
  lockout and `login_failed` on a wrong password, with a hashed ref and no raw email.
- **Manual / live:** trigger a wrong-password sign-in and a sign-up rate-limit refusal; confirm the
  `[security]` line appears in the server logs with no PII.
