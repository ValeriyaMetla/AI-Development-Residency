# ADR-0038: Test tooling moves to Vitest 4, and CI blocks on high or critical advisories in every package, dev tooling included

- **Status:** Accepted
- **Date:** 2026-11-24 (accepted 2026-11-24)
- **Relates to:** ADR-0006 (this ADR supersedes its "dev-only advisories non-blocking" policy and
  its "Vitest pinned to ^3" point), ADR-0019 (Node 22 in CI, Node 20 on the laptop), ADR-0035
  (the ruleset makes this check block merges). PenTest F-16 (R18, SR-22).

## Context

The Week 6 PenTest found **F-16 (P3)**: `npm audit` reports issues in test tooling
(`security/pentest-evidence/code-review-results.md`, X1). SR-22: pass a full dependency audit with
no high or critical issues, including test tooling. ADR-0006 deliberately made dev-only
advisories non-blocking and pinned Vitest to `^3` because Vitest 5 needs Node 22 and the sandbox
ran Node 20.

Today's full audit (2026-11-24): 9 issues, all in dev tooling, none in production packages.

- **2 critical + 1 moderate from Vitest 3.2.7:** `tinypool` (GHSA-5gmw-xhrv-c9v3, patched in
  2.1.1; GHSA-85c8-ppgw-ccpr, patched in 2.1.2) and `@vitest/mocker` (GHSA-82fw-gwwq-j7x9,
  GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp; patched in 4.1.12 and 5.0.3).
- **6 moderate from the lint tooling** (`@typescript-eslint/*` via `minimatch`), fixable without
  a major upgrade. Tried in a worktree: the 6 cleared and all 852 tests passed.

`npm audit fix --force` offers only Vitest 5.1.1. The advisory records show **Vitest 4.1.12** is
also patched for the `@vitest/mocker` issues, and Vitest 4 no longer depends on `tinypool`.
Vitest 4.1.12 supports Node `^20 || ^22 || >=24`; Vitest 5 needs Node `^22.12`. The laptop is on
Node 20.11 (ADR-0019), with npm 10.2.4.

Forces in tension: **fix the findings fully vs. not forcing a laptop runtime upgrade**; **a
blocking audit catches new risk vs. an outside advisory can turn every PR red with no change of
ours** (and since ADR-0035, red blocks every merge); a small solo build.

## Decision

1. **Upgrade Vitest from `^3.2.7` to `^4.1.12`.** Fix any tests that Vitest 4's breaking changes
   affect; no test is deleted or skipped to make the upgrade pass.
2. **Apply the non-breaking lint-tooling fix** (`npm audit fix`, no `--force`).
3. **Make the full audit blocking in CI.** In App checks, replace "Dependency report — dev
   tooling (non-blocking)" (`npm audit || true`) with **"Dependency scan — all packages incl. dev
   tooling (block on high+)"** (`npm audit --audit-level=high`). The production scan stays as its
   own named step. Moderate and low issues are still printed but don't block.
4. **When a new high or critical advisory turns CI red:** fixing it comes first (as for any red
   gate). If no fixed version exists yet, the exception is recorded in a short ADR with the
   advisory ID, why it's acceptable, and a review date, and handled with a scoped `overrides`
   entry. Never `|| true`, and never by removing the check.
5. **Vitest 5 is deferred, not refused.** Move to it together with the laptop's Node 22 upgrade
   (ADR-0019's tabled follow-up). Dependabot's PR #18 (Vitest 5.1.0) is closed with a note
   pointing here; Dependabot will keep proposing updates.

## Alternatives considered

- **Vitest 5 now (Dependabot PR #18)** — rejected for now: needs Node ≥ 22.12 and `@types/node`
  ^22 on the laptop, otherwise local `npm run verify` breaks; a bigger change than a P3 needs.
  Recorded as point 5.
- **Keep dev advisories non-blocking (ADR-0006)** — rejected: SR-22 asks for a full audit with
  no high or critical issues, and a non-blocking report is how two critical issues sat unfixed.
- **Block on moderate too** — rejected: moderate advisories in dev tooling are frequent and
  often unfixed upstream; blocking on them would make the gate noisy and train us to ignore it.
- **`npm audit fix --force`** — rejected: it jumps to Vitest 5 (above).

## Consequences

- **Positive:** the full audit is clean — **0 issues of any severity** after the upgrade (checked
  2026-11-24); a new high or critical advisory in any package now blocks a merge; the laptop and CI
  both stay supported (Node 20 and 22); all 860 tests pass on Vitest 4 with no test edits; no
  runtime code changes.
- **Negative (the point):** an advisory published upstream can turn every PR red with no change of
  ours, blocking all streams until it's fixed or excepted (point 4). Vitest 4 is one major behind
  the newest line until the Node 22 laptop upgrade.
- **Neutral:** ADR-0006's status line becomes "Partly superseded by ADR-0038 (dev-advisory policy;
  Vitest pin)"; the rest of ADR-0006 stands. On Node 20.11, Vitest 4's config could not load as
  CommonJS (`ERR_REQUIRE_ESM`), so `vitest.config.ts` is renamed `vitest.config.mts` (loaded as an
  ES module; content unchanged) and `tsconfig.json` includes `**/*.mts` so it stays type-checked.
  The laptop's npm 10.2.4 crashed installing Vitest 4 (a known npm bug, "reading 'edgesOut'"); the
  lockfile was regenerated with npm 10.9.4, the npm line CI's Node 22 ships with.
