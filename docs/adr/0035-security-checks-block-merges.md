# ADR-0035: Security checks block merges — static database-permission tests and CodeQL run in CI, a ruleset on `main` requires them, and a real-database test job is deferred

- **Status:** Accepted
- **Date:** 2026-11-23 (accepted 2026-11-23)
- **Relates to:** ADR-0006 (CI quality gate), ADR-0016 (CI is credential-free; this ADR supersedes
  its point 1 sentence "No branch protection (free plan)"), ADR-0019 (Node 22), ADR-0026, ADR-0028,
  ADR-0029, ADR-0030, ADR-0031 (the protected database steps these tests guard). PenTest F-17
  (R19, SR-23).

## Context

The Week 6 PenTest found **F-17 (P3)**: CI runs a blocking production `npm audit` and a gitleaks
secret scan, but has "no static code scanning and no automated tests for RLS or role permissions",
and whether checks block merges "depends on GitHub branch protection, which is unconfirmed"
(`security/pentest-evidence/code-review-results.md`, X4). SR-23: block a merge when any automatable
security test fails.

What exists today:

- **Static database-permission tests.** Since the PenTest, five Vitest files read the migration
  files and fail if a later migration reopens a fixed hole: `review-integrity` (ADR-0028),
  `rate-limit-integrity` (ADR-0030), `policy-integrity` (ADR-0031), `audit-append-only` (ADR-0026),
  and `no-anon-access` (ADR-0029). They run inside the "App checks (studio)" job but are not named
  as security checks. Each fix also has a SQL check script (`studio/supabase/checks/`) that Val runs
  against studio-pentest and live.
- **No merge block.** ADR-0016 point 1 recorded "No branch protection (free plan)". The repository
  is **public** (GitHub API, `"visibility": "public"`); on GitHub Free, branch protection, rulesets
  and CodeQL code scanning are available for public repositories (our understanding — to confirm in
  the repository settings when applying this ADR).
- **Where role checks live.** Since ADR-0028 and ADR-0031, the authoritative role and review checks
  are in protected database functions and RLS; the server actions' checks produce the friendly
  message. A regression that matters is therefore most likely a migration change — which the static
  tests read. (Our reading of those ADRs.)

Forces in tension: **real-database proof vs. a credential-free, fast, deterministic gate**
(ADR-0016, `ci-cd-pipeline`); **a hard block vs. the current habit of pushing docs straight to
`main`**; **solo-builder effort** while Streams A and C need Stream B's shared pieces; honesty
about what a static test can see.

## Decision

1. **Database-permission tests stay static (Option A) and are named as a security check.** Add a
   named step group to `ci.yml` — **"Security — database permissions (static)"** — that runs the five
   files above, the same way the BDD job names its steps (ADR-0016 point 3). The full suite still
   runs in App checks; the named view traces each test to its finding. Every future migration that
   changes a permission ships with a static test in the same PR (as groups 1–4 did).
2. **The real-database proof stays a checked step by hand.** For every permission migration, Val
   runs its `supabase/checks/*.sql` script on studio-pentest and then live before the app PR merges
   (the approved per-group method). CI does not claim to prove live behaviour.
3. **Add CodeQL code scanning** as its own workflow file (`.github/workflows/codeql.yml`, GitHub's
   "advanced setup", so it's versioned and reviewable), for JavaScript/TypeScript, on every push, on
   PRs into `main`, and weekly. It starts with the default query suite; widening to
   `security-extended` is a later, separate choice once we see the noise level.
4. **A ruleset on `main` makes the checks block.** Val turns it on in GitHub settings: changes reach
   `main` only through a pull request; these checks must pass — App checks (studio), BDD acceptance
   (Release 1a), Secret scan (gitleaks), Verify architectural integrity, the three Claude Skills
   checks, and CodeQL; no force-pushes or branch deletion. **No bypass** — docs go through a PR too,
   so the gate means the same thing for everyone.
5. **Prove it red → green** (ADR-0016 point 4): on a throwaway branch, add a migration that gives
   members `UPDATE` on `task_run` again; the permission step fails, GitHub shows the PR as blocked;
   the branch is deleted, never merged. Evidence goes in
   `security/pentest-evidence/retest-streamB-ci-gate.md`.
6. **Deferred, not dropped — Option B.** A throwaway local Supabase inside GitHub Actions, running
   the migrations and attacking them as real test users, is the planned next step. Revisit it when a
   static test misses a real regression, when the migration-replay model needs a rule it can't
   express, or before real users.

## Alternatives considered

- **Option B now (local Supabase in Actions)** — rejected for now: needs Supabase CLI set-up the
  repo doesn't have (no `supabase/config.toml`), Docker in each run, test-user seeding, and new
  tests; slows every run; may hit migrations that assume hosted-only features (unchecked). Stronger,
  but a project of its own for a P3, while Streams A and C wait on Stream B. Recorded as point 6.
- **Keep the merge a documented human decision (ADR-0016's position)** — rejected: the reason
  (free plan) doesn't hold for a public repository, and F-17 / SR-23 ask for an automatic block.
- **Ruleset with an admin bypass for docs-only commits** — rejected: a bypass also lets code skip
  the gate, and on a solo project the admin is the only person merging.
- **CodeQL "default setup" (settings only, no file)** — rejected: nothing in the repository records
  what is scanned; the workflow file can be reviewed and traced like the other checks.
- **Make CodeQL's findings fail the PR from day one at any severity** — rejected: an untuned
  scanner can produce noise that trains us to ignore it; start with the default suite and tune.

## Consequences

- **Positive:** a red security check now stops a merge, not just warns; access-control regressions
  like F-01 / F-03 fail a named check in CI; code scanning covers a class of bugs no current test
  looks for; CI stays credential-free and deterministic; the static tests already exist, so the cost
  is small.
- **Negative (the point):** the permission tests check a **model** of Postgres, not Postgres — a
  rule the model gets wrong (e.g. `REVOKE … FROM public` not removing `anon`'s own grant) can pass
  CI and still be wrong live; the hand-run SQL checks remain the real proof until Option B. Docs no
  longer go straight to `main` — every change needs a PR and green checks, which slows small edits.
  Required checks must keep their exact job names; renaming a job without updating the ruleset
  blocks every merge. CodeQL adds run time (a few minutes — our estimate).
- **Neutral:** SR-23 covers "SR-01 to SR-22"; which of those are automated vs. checked by hand is
  listed in the Stream B evidence file, not here. The dev-dependency audit stays non-blocking until
  F-16 is fixed (ADR-0006). ADR-0016's status line becomes "Partly superseded by ADR-0035 (branch
  protection)"; the rest of ADR-0016 stands.
