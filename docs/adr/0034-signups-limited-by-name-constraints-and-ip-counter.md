# ADR-0034: Sign-ups are limited by name-length constraints and one protected per-IP counter, refusing before an account is created

- **Status:** Accepted
- **Date:** 2026-11-23
- **Relates to:** ADR-0007 (every sign-up auto-creates an org + Accountable-Leader profile via
  `handle_new_user`). ADR-0030 (the protected-counter pattern this reuses; its platform-wide AI
  ceiling is the real cost backstop here). ADR-0023 (free tier = capacity only). Those decisions
  still stand.

## Context

The Week 6 PenTest found **F-07 (P2): unlimited fake accounts and orgs, with no sign-up input
limits.** Evidence: `security/pentest-evidence/app/ROW-S18.txt` (a 5,000-character org name was
stored), `db/S19-signup.txt` (a direct Supabase-API sign-up was confirmed instantly; a forged
role/org in metadata was ignored), `settings-results.md` (email confirmation off).

What the code does today (checked on `main`):

- `app/auth/actions.ts` (`signup`) checks only that email, password and org name are non-empty, then
  calls `supabase.auth.signUp`, passing `org_name` and `display_name` as user metadata.
- `handle_new_user` (`supabase/migrations/20261112000000_auth_handle_new_user.sql`, SECURITY
  DEFINER) copies that metadata **unchecked** into `org.name` and `profile.display_name`, which have
  **no length constraint**.
- Every sign-up creates a new org (ADR-0007), each with a fresh per-user/per-org AI cap (ADR-0030) —
  so mass sign-ups amplify F-02 and bloat the database.
- Email confirmation is **off** — a deliberate choice for easy test accounts, **accepted** until
  real organizations onboard.

Requirements: **SR-11** — org name ≤ 120 characters, display name ≤ 80 characters, enforced **in the
app and as database constraints**. **SR-12** — at most **5 sign-ups per IP per hour** (and email
confirmation on before first real use — deferred). The figures are our own judgment (PenTest report,
"Where the numbers come from"), sized so normal use stays well below them while scripted abuse hits
them quickly — not a standard.

Forces in tension:

- **Sign-up runs before anyone is logged in**, so the ADR-0030 pattern (keyed on `auth.uid()` /
  `current_org_id()`, authenticated-only) can't be used as-is. The only key available is the client
  IP, and the function must be callable by `anon`.
- **Serverless hosting** (ADR-0012): a per-IP count kept in server memory is lost between request
  copies, so the counter must be shared and persistent — a database table.
- **The app server is the only "client" the database sees** for IP purposes; the real end-user IP
  has to come from a request header the platform sets (the same root cause as F-04's lockout).
- **We don't fully control every sign-up path.** The app form is ours; the public Supabase Auth API
  (`POST /auth/v1/signup`) is reachable directly and does **not** pass through our server action.
- **Fewest moving parts** (ADR-0030): prefer one small table + function over a new outside service.
- **IP is personal data**, so the counter should avoid storing raw IPs at rest.

## Decision

**Two independent controls. (1) Name length is capped in the sign-up action and as database `CHECK`
constraints, so an oversized name is refused on every path. (2) The app's sign-up form passes the
server-observed client IP to one protected database function that counts attempts per IP per hour
and refuses past the limit before any account is created.**

1. **Database name constraints (SR-11), the path-independent backstop.** Add
   `CHECK (char_length(name) <= 120)` to `org.name` and
   `CHECK (display_name is null or char_length(display_name) <= 80)` to `profile.display_name`.
   Because `handle_new_user` runs on *every* `auth.users` insert (app form **and** direct API), an
   oversized name makes the trigger's insert fail, the `auth.users` insert rolls back, and **no
   account or org is created** — a hard reject, not a truncation. This is the BDD's "no organization
   with that name is created."

2. **App-layer validation (SR-11), the clean-message path.** The `signup` action rejects org name
   > 120 / display name > 80 *before* calling Supabase, returning a plain message (so real users see
   guidance, not a database error). The two layers are deliberate duplication: the app gives the
   message, the database is the guarantee.

3. **One small counter table, `signup_attempt`** — one row per counted sign-up attempt from the app
   form: `ip_hash` (a SHA-256 hash of the IP, **never the raw IP**) and `created_at` (set by the
   database). Row-level security is on with **no member policies**, and the automatic table grants
   from `20261112010000_rls_policies.sql` are **revoked** from `authenticated` and `anon`, so no one
   can read or reset it directly. Rows older than 2 hours are deleted by the function, so the table
   stays tiny and holds no lingering IP-derived data.

4. **One protected step, `public.claim_signup_attempt(p_ip text)`,** runs `security definer`,
   `set search_path = ''`, and in one transaction: hashes `p_ip`; takes a per-hash advisory lock (so
   a burst sent at the same instant can't all read "4 so far"); deletes rows older than 2 hours;
   counts rows for that hash in the last hour; if the count is ≥ **5** it returns `ip_hour` and
   records nothing; otherwise it records the attempt and returns `ok`. `execute` is granted to
   `anon` and `authenticated` (sign-up is pre-login), and revoked from `public`. It is safe to
   expose to `anon`: it reveals nothing about any account, and writes only a hash.

5. **The sign-up action calls the gate first.** It reads the client IP from the **`x-forwarded-for`**
   request header — Vercel's request-header docs define this as "the public IP address of the client
   that made the request." If `claim_signup_attempt` returns `ip_hour`, the action refuses with a
   plain "too many sign-ups from here, please try again later" and never calls
   `supabase.auth.signUp`. If a custom proxy is ever placed in front of Vercel, switch to
   `x-vercel-forwarded-for`, which Vercel does not overwrite — noted for the future, not needed
   today.

6. **The limit is set in the database function, not the app** (ADR-0030 point 3). Changing 5/hour
   means a new migration, on purpose, so it can't be loosened from the browser or the API.

7. **Email confirmation stays off, accepted and deferred.** It is the real fix for *fake* sign-ups
   (as opposed to *oversized* or *high-volume* ones) and will be turned on before real organizations
   onboard (R8, SR-12).

## Honest limits of this fix

The per-IP counter **reliably limits the app's own sign-up form**, where the IP is observed
server-side and the user can't choose it. It is **best-effort, not a hard boundary**, against a
determined scripted attacker, because:

- A caller hitting the **Supabase Auth API directly** bypasses the server action and the counter
  entirely. That path is bounded instead by the **name constraints** (point 1 — no junk payload),
  **Supabase's own built-in auth rate limits** (per-IP, a dashboard setting worth confirming and
  raising; a settings item like X3/R20), and the **platform-wide AI ceiling from ADR-0030** (caps
  the cost even with many orgs).
- A caller invoking `claim_signup_attempt` directly could pass a fabricated `p_ip` to dodge their
  own bucket, or a victim's IP to briefly block that IP from the app form (minor griefing, sign-up
  only).
- Vercel's docs state what `x-forwarded-for` *contains* but do **not** explicitly document whether
  it can be spoofed on a direct hit with no proxy in front (a confidence flag — this is an inference
  from the documented meaning, not a confirmed guarantee). So we treat the IP bucket as
  rate-limiting, not authentication.

These are accepted for an MVP: the combination closes the demonstrated finding (oversized names
stored; unlimited easy app sign-ups) and bounds the cost, with email confirmation as the follow-on.

## Alternatives considered

- **Edge rate-limiting only (Vercel firewall).** The report's "network principles" line suggests it,
  but ADR-0030 §7 found the Hobby-plan specifics unconfirmed, and it can't see the direct-API path
  either. Kept as a possible outer layer, not the mechanism.
- **An app-memory counter.** Rejected: lost between serverless copies (the same reason as ADR-0030).
- **Calling the counter from inside `handle_new_user`** (to cover the direct path too). Rejected: the
  trigger can't see the end-user IP; it would have to come from metadata the direct caller controls
  or omits, so it wouldn't enforce anything.
- **Storing the raw IP.** Rejected: IP is personal data; a short-retention hash buckets just as well
  without plaintext at rest.
- **Email confirmation now.** The real anti-fake-account fix, but it breaks the accepted
  easy-test-account workflow; deferred by R8, not by this ADR.

## Consequences

- **Positive:** Oversized names are refused on every path at the database level (SR-11). The app's
  sign-up form has a shared, serverless-safe 5/hour IP limit (SR-12) with no new service or secret,
  holding no raw IPs. One readable function owns the limit.
- **Negative (accepted):** the IP limit is best-effort, not a hard boundary (see "Honest limits").
  The direct-API and spoofed-IP paths lean on the name constraints, Supabase's own auth limits, and
  the platform AI ceiling.
- **Negative (accepted):** a shared IP (office / NAT) could reach 5/hour legitimately; the number is
  sized generously for a pilot and tunable by migration.
- **Neutral:** sign-up adds one small database call before `auth.signUp`. The work ships as two PRs —
  migration + static test + check script first (applied to studio-pentest, then live), then the
  app-code PR — because the action will call a function that must already exist.

## Proof

- **Static migration test:** fails if a later migration gives app users direct access to
  `signup_attempt`, drops the name constraints, or removes the per-IP limit (mirrors ADR-0030's
  static test).
- **Check script** `studio/supabase/checks/signup-rate-limit-check.sql`: inside a rolled-back
  transaction, calls `claim_signup_attempt` five times → `ok`, the sixth → `ip_hour`; confirms a
  direct insert/select on `signup_attempt` is refused; inserts an oversized `org.name` /
  `display_name` and confirms the constraint rejects it. Val runs it on studio-pentest, then live.
- **Unit tests:** the sign-up action refuses over-length names, and refuses when the gate returns
  `ip_hour` or errors (fail closed), before `auth.signUp` is called.
- **Break-it check:** weaken each control (raise the limit, drop a constraint) and confirm the tests
  fail.
