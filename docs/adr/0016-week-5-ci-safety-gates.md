# ADR-0016: Run CI on every branch, gate-check the Claude Skills, and trace checks to Week-2 BDD

- **Status:** Proposed
- **Date:** 2026-11-15

## Context

[ADR-0006](0006-ci-quality-gate.md) stood up the application quality gate (lint, format, types,
Vitest, `next build`, production-dependency audit, dev-dependency report, gitleaks) plus the
separate Architecture Quality Gate. Those protect `main`, but **pushes to other branches ran
neither workflow**, and nothing validated the 20 Claude Skills or tied the checks back to the
Week-2 requirements.

The Week 5 assignment requires: automatic checks on **every push**; at least **three new checks**
derived from the Week-2 use cases + BDD; a **gate-check of the Week-1 Skills** so a push that breaks
one fails; and a real **red → green** proof. Forces in tension: early feedback on branches;
traceability an instructor can read without a giant log; **determinism** (no Claude credentials or
model judgments in a required gate); honest evidence (structural validation is not proof a Skill is
*good*, and unit tests are not end-to-end proof); low-friction solo delivery (more jobs = clearer
signal but more Actions minutes); and a safe way to prove a red run without an invalid commit
entering `main`.

This ADR **extends ADR-0006; it does not supersede or weaken it.**

## Decision

1. **Run both existing workflows on every branch push.** `ci.yml` and `arch-gate.yml` use an
   unrestricted `push:` trigger plus `pull_request` → `main`, each with a `concurrency` guard that
   cancels superseded runs. `main` behavior is unchanged. No branch protection (free plan), so the
   merge decision stays a documented human responsibility.

2. **Add a deterministic, zero-dependency Skills gate** (`scripts/skills-gate.mjs`, mirroring
   `arch-gate.mjs`) with `structure`, `sync`, and `all` modes, exposed as **two separately named CI
   checks** so neither hides the other:
   - **Claude Skills — Structure** — validates every `.claude/skills/<name>/SKILL.md`: a non-empty
     file; a canonical frontmatter subset (top-level scalars + an indented `metadata` map; tabs,
     duplicate keys, unknown top-level keys, and `<`/`>` are rejected); required non-empty
     `name`/`description`/`metadata.version`; kebab-case `name` matching its folder, unique, not
     prefixed `claude`/`anthropic`; `description` ≤ 1024 chars; numeric `major.minor[.patch]`
     version; a first-line H1; the core sections `## Intent → (≥1 rule) → Checklist → When unsure →
     Based on` in order; and resolvable relative links. It **forbids** a per-Skill `README.md`
     (SKILL.md is the source of truth). It discovers the inventory dynamically (never hard-codes 20).
   - **Claude Skills — Library sync** — reconciles the real Skill directories with the
     `### <name> ✅|🔨|⬜` entries in `docs/SKILLS-LIBRARY.md`: every real Skill has one built (✅)
     entry with its canonical `SKILL.md` link; every built entry resolves to a real Skill; planned
     (⬜) entries need no file; no duplicates; built-entry count equals the real count; relative
     links resolve.
   - A third **gate self-test** check runs `node --test scripts/skills-gate.test.mjs` against
     permanent malformed fixtures under `scripts/fixtures/skills-gate/` (never under the real Skill
     root), asserting the exit status and the stable error code — so the gate is itself trusted.

3. **Trace Week-2 BDD to checks as ONE named BDD-acceptance job** (trimmed from an earlier
   five-job design to control CI minutes — see Alternatives). **BDD acceptance (Release 1a)** runs
   the mapped Vitest files as named per-dimension steps (Policy seed — F1.1; Active-policy
   inheritance — F1.3; Co-Pilot safety — F4.1/F4.2/F4.4 + the shipped F5.1 slice). The full
   application test job stays intact; the BDD steps are traceability views, not a replacement. A
   traceability record labels each scenario covered / partial / gap, and does not claim Release-1b
   PII/approval or MMP behavior as Week-5 evidence. *(This job is the remaining piece at the time of
   writing.)*

4. **Prove red → green on a disposable branch.** From a green implementation commit, a throwaway
   branch blanks one Skill's `metadata.version` → **Claude Skills — Structure** fails with
   `REQUIRED_FIELD_MISSING`; reverting restores green. The proof branch is never merged, so no
   invalid commit reaches `main`.

5. **Defer automated accessibility.** Manual Week-5 QA records responsive/keyboard/comprehension
   observations; a credible scanner with owned thresholds is a later decision. A superficial scan is
   not counted as accessibility conformance.

6. **Keep semantic Skill evaluation separate.** The gate proves structure and sync only; triggering
   accuracy and usefulness remain `skill-evaluation`'s job and are not run on every push.

## Alternatives considered

- **Keep push triggers on `main` only / PR-only** — rejected: late feedback, and the assignment
  requires every-push.
- **Five separate new checks (2 Skill + 3 per-dimension BDD jobs)** — the original plan; **trimmed
  to three** (Structure, Library sync, one BDD-acceptance job with named steps). Three separate BDD
  jobs each re-install and re-run the same suite (3× overhead) for the same signal; named steps in
  one job keep per-dimension traceability without the waste. Still clears "≥3 new checks."
- **One generic "Week 5" job** — rejected: hides which concern passed; weakens traceability.
- **A live Claude call to judge each Skill** — rejected: non-deterministic, needs credentials/spend,
  and still needs a separate eval design; unsuitable for a required gate.
- **A YAML dependency for frontmatter** — rejected: the canonical schema is intentionally small; a
  zero-dependency parser runs before app installs and states its supported subset.
- **Hard-code 20 Skills** — rejected: adding/removing an indexed Skill must not require editing the
  validator.
- **Fixtures under `.claude/skills/`** — rejected: they would be mistaken for real Skills and keep
  the repo permanently red.
- **Make/revert the broken proof commit on the implementation branch** — rejected: a later non-squash
  merge could carry the invalid commit into `main` history.

## Consequences

- **Positive:** every branch push gets CI + architecture feedback; Skill-file and index drift becomes
  a blocking, explainable failure; three new checks are visible by name and traceable to Week-2; the
  gate is fast, deterministic, and credential-free. Building the gate immediately **caught three real
  defects** — `mvp-scoping`, `pitch-deck`, and `rapid-prototyping` had `description` fields over the
  1024-char Skills limit; they were trimmed (triggers preserved) so the gate passes and the
  descriptions are within spec.
- **Negative (accepted):** unrestricted push triggers and the extra named jobs consume more Actions
  minutes and can double-run on a branch with an open PR (concurrency limits the waste). The
  canonical frontmatter/body rules become enforced contracts: a deliberate Skill-format change must
  update the Library standard, fixtures, and validator together.
- **Neutral:** a green Skill gate proves structure and sync, **not** semantic quality or triggering;
  the BDD checks prove the mapped automated boundaries only (partial/gap coverage stays visible, and
  the two live manual tests are still required); accessibility automation remains deferred. ADR-0006's
  dependency-risk policy is unchanged.
