# ADR-0030: AI requests are rate-limited by one protected database step that counts and records each request, and refuses when unsure

- **Status:** Accepted
- **Date:** 2026-11-22
- **Relates to:** ADR-0023 (free tier = capacity only). Its decisions still stand; this ADR changes
  one behaviour in its run-cap code (the cap now fails closed, point 5). Same protected-function
  pattern as ADR-0028.

## Context

The Week 6 PenTest found **F-02 (P1): no rate limiting on AI calls.** Evidence:
`security/pentest-evidence/code-review-results.md` (S11) and `ai/ROW-S11.txt` (12 Co-Pilot
assessments from one account in about 2 minutes, none throttled).

What the code does today (checked on `main`):

- Only two places reach Claude: the Co-Pilot (`assessUse`, `app/(app)/copilot/actions.ts`) and
  Skill runs (`runSkill`, `app/(app)/skills/actions.ts`). A Co-Pilot assessment makes 1 Claude
  call; a Skill run makes 2 (draft + self-critique, `lib/domain/pipeline.ts`).
- The Co-Pilot has no limit at all.
- Skill runs have a 500-runs-per-month cap per org (`FREE_MONTHLY_RUN_CAP`, ADR-0023). If the count
  can't be read, the code treats it as 0 and lets the run through ("capacity fails open").
- Every sign-up creates a new org (ADR-0007), so per-org limits reset with each new account.

Requirements: **SR-02** — limit AI requests to 10 per minute and 200 per day per user, and 1,000
per day per org, refusing before any Claude call. **SR-03** — refuse when the usage count can't be
read (fail closed). The figures are our own judgment (PenTest report, "Where the numbers come
from"), not a standard.

Forces in tension:

- **The limit must hold outside the app.** The public key allows direct database calls
  (threat-model crossing C7), so a counter that members can edit or delete is no limit.
- **No admin key in the app** (PenTest row DS2, ADR-0028). The database can't tell the app from the
  same user calling the API, so the counter must protect itself.
- **Serverless hosting** (ADR-0012). Each request can run on a different short-lived server copy,
  so counts kept in server memory are lost.
- **Cost is real.** The platform pays Anthropic for every call (ADR-0023), so abuse turns directly
  into a bill.
- **Fewest moving parts.** One person maintains the app; a new outside service adds an account, a
  secret and a dependency.
- **Safety must not be capped** (ADR-0023 §4). A limit may only stop a request before any output.
- **CI is credential-free** (ADR-0016), so database behaviour can't be tested in CI today.

## Decision

**Every AI request first passes one protected database function, which checks the limits and
records the request in one all-or-nothing step. If the limits can't be checked, the request is
refused.**

1. **One small counting table, `ai_request`,** with one row per allowed AI request: `user_id`,
   `org_id`, `kind` (`copilot` or `skill`) and `created_at` (set by the database). **It never
   stores the text the person typed**, because the count doesn't need it. Row-level security is
   on with **no member policies**, and the automatic table permissions from
   `20261112010000_rls_policies.sql` are **revoked** from `authenticated` and `anon`, so members
   can't read, add, change or delete rows directly.
2. **One protected step, `public.claim_ai_request(p_kind)`,** runs with elevated rights
   (`security definer`, `set search_path = ''`) and, in one transaction:
   - refuses if there is no signed-in user, or no org (`current_org_id()`);
   - refuses an unknown `kind`;
   - takes a per-user lock, so two requests sent at the same moment can't both slip under the
     per-minute limit;
   - counts the caller's requests in the last minute and the last 24 hours, the org's in the last
     24 hours, and everyone's in the last 24 hours;
   - if any limit is reached, returns which one (`user_minute`, `user_day`, `org_day`,
     `platform_day`) and records nothing;
   - otherwise records the request and returns `ok`;
   - deletes rows older than 2 days, so the table stays small.

   `execute` is granted to `authenticated` only (revoked from `public` and `anon`). Because it runs
   with elevated rights, it repeats every check itself.
3. **The limits live in the database function, not the app.** They are 10 per minute and 200 per
   day per user, 1,000 per day per org (SR-02), and **5,000 per day across the whole platform**.
   The platform figure is our addition, a placeholder sized to a small pilot, not to cost data. It
   stops the sign-up loophole (new accounts mean fresh per-user and per-org limits) from running
   up the bill. The limits use rolling windows (the last minute, the last 24 hours), not calendar
   days. Changing a number means a new migration, on purpose, so the limits can't be loosened
   from the browser or the API.
4. **One gate, called by both AI entry points, before any Claude call.** Each counts as one user
   action: one Co-Pilot assessment = 1, one Skill run = 1 (a Skill run costs 2 Claude calls).
   - **Service layer** (`assessUse`, `runSkill`): after sign-in and input checks, right before the
     pipeline, call the gate. A refusal returns a plain "try again later" message.
   - **Domain layer:** a pure helper turns the outcome into the message and decides "allowed or
     not". The database is the enforcer; the helper only handles wording.
   - **Data Source layer:** `claimAiRequest(kind)` makes the one `supabase.rpc('claim_ai_request')`
     call and returns `null` on any error.

   A request is counted when it is **attempted**, before Claude runs, so requests that later fail
   or get blocked by a guardrail still count. Otherwise someone could flood the app with requests
   that fail on purpose.
5. **Fail closed, including the monthly cap.** If the gate returns an error or nothing, the
   request is refused with "We couldn't check your usage just now. Please try again in a minute."
   The monthly run cap changes the same way: if `countOrgRunsThisMonth` fails, the run is refused
   instead of treated as 0. **This reverses the "capacity fails open" behaviour in today's code**
   (`skills/actions.ts`, `lib/data/entitlements.ts`). The reason: a governed run already needs the
   database for its safety steps, so when the database can't answer, the run wasn't going to
   succeed safely anyway. Refusing early costs the user little and closes SR-03.
6. **Safety is unchanged** (ADR-0023 §4). The gate decides only whether a request may *start*. It
   never changes a safety step, and an allowed request runs the same pipeline on every plan.
7. **A second layer outside the app (Transfer).** Val sets a monthly spending limit in the
   Anthropic console (to confirm the console offers this), so a mistake in our limits can't run up
   an unbounded bill. A Vercel firewall rule by internet address is optional and deferred: it can't
   see users or orgs, and what the Hobby plan includes is unconfirmed.
8. **Proof, without a database in CI.**
   - Unit tests for the Domain helper (each outcome → message; `null` → refused) and for both
     actions (refused before the pipeline runs; the monthly cap fails closed).
   - A static test that reads the migrations and fails if any later one gives app users direct
     access to `ai_request`, re-grants `execute` to `anon`, or removes the platform limit.
   - A check script, `studio/supabase/checks/rate-limit-check.sql`. It sends requests as a
     signed-in user inside a transaction that is then rolled back (the 11th in a minute refused,
     direct insert or delete refused, logged-out call refused, cleanup row). Val runs it on
     studio-pentest, then on live.

## Alternatives considered

- **A separate counting service (Upstash Redis, offered through Vercel).** Rejected for now: a new
  company, account, secret and package for a small pilot's traffic, plus a new outside dependency
  that would stop all AI use if it went down, because we fail closed. It's the better tool at large
  scale. **Revisit if** the extra database step measurably slows AI requests, or traffic outgrows
  one small table.
- **A Vercel firewall rule only.** Rejected as the main limit: it sees internet addresses, not
  users or orgs, so it can't enforce SR-02. Kept as an optional outer layer (point 7).
- **Counting in the server's memory.** Rejected: it doesn't work on serverless hosting, because
  counts are lost between server copies.
- **Counting from existing tables (`task_run`, `copilot_assessment`) instead of a new table.**
  Rejected: members can create those rows in other ways, the two tables would need two different
  counts, and a request refused or failed before its row is written wouldn't count.
- **Limits sent from the app as function arguments.** Rejected: anyone could call the function
  directly with a higher limit.
- **Keep the monthly cap failing open.** Rejected: it conflicts with SR-03, and the database is
  already needed for a safe run (point 5).

## Consequences

- **Positive:** F-02 is closed at the database level, so the app, a script and the API all meet
  the same limits. One readable function owns every limit. No new service, secret or package.
  The platform-wide ceiling caps the worst-case bill even with many fake sign-ups. Members can't
  reset their own count.
- **Negative (accepted): org and platform limits are slightly soft under heavy parallel load.** The
  lock is per user, so two different users in the same org at the same instant could both get the
  last org slot. That's at most a few requests over, which is acceptable for a cost limit.
- **Negative (accepted): one member can use up their org's daily allowance** for everyone in it,
  through the app or by calling the function directly. The per-user daily limit (200) bounds this
  to a fifth of the org's 1,000.
- **Negative (accepted): a database hiccup now stops AI requests** (fail closed) instead of
  letting them through. Users see "try again in a minute".
- **Negative: the platform-wide ceiling can lock out honest users** if abuse fills it. That's the
  trade for a bounded bill. The number is a placeholder to tune with real usage and cost data.
- **Negative: changing a limit needs a migration.** That's slower to tune, deliberately.
- **Neutral:** each AI request adds one small database step before the Claude call. We expect this
  to be small next to the Claude call itself; that's our estimate, not measured. The migration
  ships in its own PR with its static test. The app-code PR merges **only after** the migration is
  applied to studio-pentest and then live, because the new gate refuses every AI request until the
  function exists. This ADR is the deliberate change to the cap's failure mode; ADR-0023's
  decisions stand.
