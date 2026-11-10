# ADR-0006: Stand up the CI quality gate (supersedes ADR-0002)

- **Status:** Accepted
- **Date:** 2026-11-09

## Context
[ADR-0002](0002-defer-ci-quality-gate.md) deferred the back-end half of the "quality sandwich" —
an automated CI gate on every PR — until app code landed, and said to revisit at the start of
Week 3. App code has now landed (the `studio/` scaffold, Phase 0 Step 1), and the Build Plan
(NFR-O1 / Step 6) specifies the gate's checks. The deterministic architecture scanner
(`arch-gate.yml`) already runs; what is missing is the **app-level** gate.

Forces in tension:
- **Deterministic protection** — broken, unverified, or insecure code must not reach `main`.
- **Security as a requirement** — the product handles sensitive nonprofit data; committed secrets
  and vulnerable *production* dependencies must be caught automatically.
- **YAGNI / solo build** — the gate must be green and low-friction, not a wall of false failures
  that trains the builder to ignore it.

## Decision
Add a GitHub Actions **`CI`** workflow (`.github/workflows/ci.yml`), running on every PR and push
to `main`, alongside `arch-gate.yml`. For the `studio/` app it runs: **ESLint**, **Prettier
`--check`**, **`tsc --noEmit`**, **Vitest**, **`next build`**, and **dependency + secret scanning**.
Specifics:

- **Dependency-scan policy:** block on **high-or-worse severity in production dependencies**
  (`npm audit --omit=dev --audit-level=high`); report dev-only tooling advisories **non-blocking**.
  Rationale: production dependencies ship to users; dev tooling (test runner, bundler) never
  reaches runtime. [Dependabot](../../.github/dependabot.yml) proposes updates for both weekly.
- **`postcss` override:** pin `postcss` to `^8.5.32` via `overrides` to patch a high-severity
  advisory in the version Next 15 bundles, **without** a breaking Next 16 upgrade.
- **Vitest pinned to `^3`:** Vitest 5 requires `@types/node ≥ 22`; the stack runs on **Node 20**,
  so v3 is the compatible line. Revisit when moving to Node 22.
- **Secret scanning:** gitleaks over full history.

This **supersedes ADR-0002**, whose status is set to "Superseded by ADR-0006." Resolves
decision **D7**.

## Alternatives considered
- **Block CI on *all* vulnerabilities, including dev tooling** — rejected: forces breaking
  upgrades (Vitest 5 / Node 22) or a perpetually red gate over advisories that never reach
  runtime; low real-world value for a solo MVP.
- **Upgrade to Next 16 now to fix postcss** — rejected: a breaking major for a build-time,
  low-runtime-risk advisory; deferred to a deliberate upgrade (tracked by Dependabot), not a CI
  side-effect.
- **Fold the app checks into `arch-gate.yml`** — rejected: arch-gate is intentionally
  zero-dependency and architecture-only; app checks need an npm install and address a different
  concern. Keep them as separate, focused workflows.

## Consequences
- **Positive:** a deterministic gate on every PR; production dependencies held to a high bar
  (currently **0 vulnerabilities**); committed secrets caught; a Vitest harness exists for the
  testing pyramid (Build Plan Step 7); Dependabot keeps dependencies current.
- **Negative (the point):** known **dev-tooling** advisories (7 moderate, 2 critical in the test
  runner / bundler) are **accepted as non-shipping and tracked**, not fixed immediately — an
  informed risk acceptance, to be revisited at the Node 22 / Vitest 5 move. CI also adds ~a minute
  and an npm install per PR.
- **Neutral:** the checks mirror NFR-O1; thresholds and tools (gitleaks, audit level) are tunable.
  Extends ADR-0002's intent; the arch-gate remains the architecture half of the sandwich.
