# ADR-0037: Repeated failed logins are throttled by one protected counter — per account (escalating) and per IP

- **Status:** Accepted
- **Date:** 2026-11-23
- **Relates to:** ADR-0030 / ADR-0034 (same protected-counter pattern; reuses the `anon`-execute
  exception rationale of ADR-0034 and its `x-forwarded-for` IP handling). ADR-0033 (session markers
  reset on login). Password strength (8+ mixed) was fixed separately in group 0. ADR-0036 is already
  taken, so this takes 0037.

## Context

The Week 6 PenTest found **F-04 (P2)**: ten wrong passwords in a row produced no lockout or
slowdown, and the correct password still worked. Supabase's own per-IP sign-in limit sees **our
server's** address, because sign-in runs server-side — so it throttles the server, not the attacker.
Password strength is fixed (group 0); the lockout is what remains.

**SR-07:** block sign-in for **15 minutes after 5 failed attempts on one account (doubling on
repeat)** and **after 20 failed attempts from one IP within 15 minutes**, **without revealing whether
the account exists.** The numbers are our judgment, in line with the OWASP Authentication Cheat
Sheet.

Same forces as F-07 (ADR-0034): the limit must hold outside the app (a locked-down database counter,
not app memory, which is lost on serverless hosting); sign-in is pre-login, so the counter must be
`anon`-callable; and the app has no service-role key.

## Decision

**Two small locked tables and two protected functions throttle failed logins. The login action
checks before the password check and records the outcome after.**

1. **`login_lock`** — the per-account escalation state, keyed by a **SHA-256 hash of the lowercased,
   trimmed email** (never the raw email): `email_hash` (primary key), `fail_count`, `lock_level`,
   `locked_until`, `updated_at`. One row per email-hash with recent failures.
2. **`login_attempt`** — the per-IP rolling log of failed attempts: `ip_hash` (SHA-256 of the
   `x-forwarded-for` client IP) and `created_at`. Used only for the 20-in-15-minutes IP rule.
   - Both tables: row-level security on, no policies, and the automatic grants from
     `20261112010000_rls_policies.sql` revoked from `authenticated` and `anon` — only the functions
     (security definer) read or write them.
3. **`login_guard(p_email, p_ip)` → `'ok'` | `'locked'`** (security definer, `set search_path = ''`,
   `anon`-callable). Hashes the email and IP internally, then returns `locked` if the account's
   `locked_until` is in the future **or** the IP has ≥ 20 failures in the last 15 minutes. Called
   **before** `signInWithPassword`.
4. **`login_record(p_email, p_ip, p_success boolean)`** (security definer, `anon`-callable), called
   **after** the password check (it hashes the email and IP internally too):
   - **Success:** delete the account's `login_lock` row — a correct password clears the escalation,
     so one mistyped password never creeps toward a lock.
   - **Failure:** insert one `login_attempt` for the IP; bump the account's `fail_count`; when it
     reaches **5**, raise `lock_level` by 1, set
     `locked_until = now() + interval '15 minutes' * 2 ^ (lock_level - 1)` (15 → 30 → 60 …) and reset
     `fail_count` to 0. Prune `login_attempt` rows older than 20 minutes and `login_lock` rows whose
     window has long passed, so both tables stay small.
5. **Email and IP are hashed in the database** (pgcrypto `extensions.digest`, proven in F-07). The
   lock applies to the hash of *whatever email is typed*, so it works — and looks identical —
   whether or not the account exists (non-disclosure). No raw email or IP is ever stored.
6. **The login action** (`app/auth/actions.ts`): pass the email and client IP to `login_guard`
   (hashed inside) → if `locked`, show the generic message and **do not** call `signInWithPassword`;
   otherwise sign in; then call `login_record` with the outcome; on a wrong password, show the
   generic message.
7. **The guard fails open** (decision A). If `login_guard` returns an error or nothing, the sign-in
   attempt is **allowed to proceed** — the password is still required. The alternative (fail closed)
   would turn a database blip into a total sign-in outage for every user, a worse failure than a
   brief lapse in throttling. `login_record` is best-effort for the same reason. (This is the one
   place the project's gates do **not** fail closed, and deliberately: for the AI gate a failure
   meant the run could not proceed safely anyway; here a failure must not lock out honest users.)
8. **The message is generic** (decision B): the **same "Email or password is incorrect."** for a
   wrong password *and* a lockout, so nothing reveals account existence or that a lock is in effect.
   The limits live in the functions (changing a number needs a migration, as in ADR-0030/0034).

## Alternatives considered

- **Forward the real client IP to Supabase Auth** so its built-in limit applies per-attacker. Helps
  the IP rule but does nothing for the **per-account** lockout, so it can't replace this. A possible
  added layer later.
- **A fixed 15-minute lockout, no doubling.** Simpler, but SR-07 asks for escalation; the
  `lock_level` column is the only extra state.
- **Computing the lock from a flat attempt log** instead of a state row. Rejected: "doubling across
  lock cycles" is far simpler with an explicit `lock_level`.
- **Fail closed on the guard.** Rejected (decision A): a database hiccup would lock every user out.
- **A distinct "too many attempts" message.** Considered (decision B); it is kinder to real users and
  still hides account existence, but we chose maximal non-disclosure for now. Revisit if locked-out
  users are confused in practice.
- **Storing raw email/IP.** Rejected: personal data; a short-retention hash buckets just as well.

## Consequences

- **Positive:** password-guessing and credential-stuffing are throttled per account *and* per IP,
  enforced in the database so a script hitting the app or the API meets the same limit. No raw
  emails or IPs are stored.
- **Negative (accepted):** with the generic message, a *legitimate* locked-out user sees only
  "incorrect," doesn't know they're locked, and may keep trying — which, via the doubling,
  **escalates their own lockout**. Accepted for maximal non-disclosure; revisit if it bites.
- **Negative (accepted):** the guard fails open, so during a database outage the lockout is briefly
  unenforced (the password is still required).
- **Negative (accepted):** a shared IP (office / NAT) could reach 20 failures in 15 minutes from
  legitimate users; sized generously, tunable by migration.
- **Negative (accepted):** the email-hash is low-entropy (brute-forceable if the table leaked),
  mitigated by short retention and the table being unreadable by app users.
- **Neutral:** login adds two small database calls around `signInWithPassword`. The migration ships
  in its own PR with its static test and check script; the app PR merges only after the migration is
  on studio-pentest and then live, because the action calls functions that must already exist.

## Proof

- **Static test** (like `signup-integrity`): fails if a later migration opens either table to app
  users, turns RLS off, adds a policy, drops a limit (5 / 15 min / 20), or changes the doubling
  formula; asserts both functions keep `security definer`, the pinned `search_path`, and their
  checks. Break-it checks built in.
- **Check script** `studio/supabase/checks/login-lockout-check.sql`: 5 failures → the account is
  locked and a 6th sign-in is refused even with the "right" password; a successful login clears the
  lock; 20 IP failures → the IP is locked; direct insert/select/delete on either table is refused.
  All inside a rolled-back transaction.
- **Unit tests** for the Domain decision helper (guard/record outcomes → decision + message, fail
  open) and for the login action (guard before `signInWithPassword`; records after; generic message;
  success clears the lock). Break-it checks.
