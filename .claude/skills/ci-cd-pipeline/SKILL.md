---
name: ci-cd-pipeline
description: Designs the automated CI/CD gate on GitHub Actions — run required checks on every push, keep them fast, deterministic and credential-free, put script-judgeable checks in CI (architecture, unit tests, regressions, security and dependency scanning, accessibility) and keep human/real-environment concerns (UX flows, UI look, real performance, live integrations) out, trace each check to the requirement it protects, and prove the gate blocks a bad push with a red-to-green run. Use when setting up CI, adding or fixing a GitHub Actions check or workflow, running checks on every push, making a gate fail a bad push, speeding up a slow pipeline, wiring deploy-on-merge, or deciding what belongs in a pipeline — even if the user doesn't say "CI/CD". Do NOT use for writing the tests themselves (use testing-code-review), deciding what layer code belongs in (use judge-arch), or hosting/environment setup (use deployment).
metadata:
  version: 1.0
---

# CI/CD Pipeline

## Intent

Design the automated gate that lets code reach users *safely and often*: every change is checked
by scripts before it merges, so small changes ship continuously and a break is caught in minutes,
not at a big risky release. Because the gate is deterministic, it enforces the rules regardless of
what a developer or an AI assistant *claimed* — the check, not the claim, is the proof. This skill
owns the *checks and the merge gate* — not the tests themselves, the architecture, or the hosting.
Grounded in the Week-5 QA/CI-CD lecture (§15–17), ADR-0016/0019, and Martin Fowler's *Continuous
Integration*.

## Rules

1. **Run required checks on every push, not just `main`.** A break on any branch should surface
   immediately, not at merge time. Use an unfiltered `push:` trigger plus `pull_request` into
   `main`, and add a `concurrency` guard that cancels superseded runs so rapid pushes don't pile up
   and burn minutes.
2. **Keep the gate fast, and fix a red one first.** Fast feedback is the whole point — order checks
   cheap-first (lint/types before a long test run) so a bad push fails in seconds, and keep the
   required gate quick (the classic ~ten-minute build). When a required check goes red, fixing it is
   the top priority; don't pile new changes onto a broken gate, or every later push builds on an
   unknown-good base.
3. **Keep every required check deterministic and credential-free.** A gate that can block a merge
   must return the same verdict every run — so no live LLM/model judgment and no secrets or
   credentials inside a required check. Zero-dependency checks (just the pinned runtime) run before
   the app installs: fast and reproducible. (ADR-0019 pins Node for exactly this.)
4. **Put in CI what a script can reliably judge:** architecture/layer standards, unit tests,
   regressions (re-run the whole suite every push), security — dependency and secret scanning — and
   automatable accessibility checks. These catch a weak spot before it ever ships.
5. **Keep out of CI what needs human eyes or a real environment:** UX-flow quality, UI look and
   pixel-fidelity, real-world performance/load, and live third-party integrations. A script on a
   small, clean runner can't judge these — and hitting live services risks flakiness and rate limits.
   They belong to manual / live-app QA, not a required gate.
6. **Derive checks from the requirements and keep them traceable.** Tie each check back to the use
   case / BDD scenario / ADR it protects, and name it so a reviewer reads the result without digging
   through a giant log.
7. **Prove the gate actually blocks a bad push — red→green.** Break one thing on purpose on a
   disposable branch, watch the gate fail with a specific error, then revert to green. Never merge
   the broken commit (a later non-squash merge could carry it into `main`). An unproven gate isn't
   a trusted gate.
8. **CD is deploy-on-merge; the pipeline owns the checks and the merge decision, not hosting.**
   Pass → the change can deploy; fail → do not merge. With no branch protection (e.g. a free plan),
   say so plainly: the human merge is then the *documented* gate, not an automated block — don't
   imply otherwise.
9. **Be honest about what a green gate proves.** Structural and automated checks prove structure and
   the mapped boundaries — not semantic quality, good UX, or that a feature truly works end to end.
   Keep semantic evaluation and the live manual tests as separate, still-required steps.

## Checklist before calling a pipeline "done"

- [ ] Runs on every push (unfiltered `push:`) and on PRs into `main`; a concurrency guard cancels superseded runs
- [ ] Gate is fast (fast checks first; aim for the ~ten-minute build); a red required check is fixed before new work
- [ ] Every required check is deterministic and credential-free (no LLM/secrets in a required gate)
- [ ] CI covers the script-judgeable set: architecture, unit, regressions, dependency + secret scan, a11y where automatable
- [ ] Human/real-environment concerns (UX, UI look, performance, live integrations) are NOT required CI checks — routed to manual/live QA
- [ ] Each check is named and traces to the requirement/BDD/ADR it protects
- [ ] A red→green proof ran on a disposable branch and was never merged
- [ ] Merge rule explicit: fail → don't merge; no branch protection → documented human merge
- [ ] The green-gate claim is honest (structure/automation only — not quality or UX)

## When unsure

- Can't tell if a check belongs in CI? Ask: can a script judge it reliably with no human and no real
  environment? If no, it's manual/live QA, not a required gate.
- If a check would need credentials or a model call, it can't be a required gate — move it out or make
  it advisory (non-blocking).
- Writing the tests is [[testing-code-review]]; the layer-placement check is [[judge-arch]]'s
  `arch-gate` (one check *inside* the pipeline); hosting/env is [[deployment]].

## Based on

- **Week-5 QA/CI-CD lecture §15–17** — the DevOps pipeline, CI/CD old-vs-new, and what belongs in CI
  vs what doesn't (`docs/reference/week-5-qa-cicd.md`)
- **ADR-0016** — CI safety gates: every-push triggers, deterministic credential-free gates, ≥3 checks
  traced to BDD, the red→green proof; **ADR-0019** — pin the toolchain (Node 22) for reproducible CI
- **Martin Fowler, *Continuous Integration*** (martinfowler.com) — self-testing build, commit
  frequently, fix broken builds immediately, keep the build fast; and his *Practical Test Pyramid*
  (the lecture's cited source)
- Composes with [[testing-code-review]] (writes the tests this gate runs), [[judge-arch]]
  (`arch-gate` is one check inside — the generation-time half of the quality sandwich), [[secure-coding]]
  (its secret/dependency guidance, operationalized as CI checks), and [[deployment]] (hosting/env)

## Examples

**❌ Bad** — a required check calls the Claude API to "grade" the code (non-deterministic, needs
credentials); the workflow runs only on `main`; "unit tests pass" is presented as proof the UX is
fine; and no one ever proved that a bad push actually fails.

**✅ Good** — required checks run on every push behind a concurrency guard, fast checks first, all
deterministic and credential-free (lint, types, unit, `arch-gate`, dependency + secret scan), each
named and traced to its BDD scenario/ADR; a disposable branch proved red→green and was discarded;
UX-flow and UI-render checks are left to manual QA on the live app; and the green gate is described
as structural only.
