# ADR-0019: Move the toolchain and CI to Node 22

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

All CI workflows pinned Node 20 (`ci.yml`, `skills-gate.yml`, `arch-gate.yml`), and the
local/dev sandbox runs Node 20.11.0. `@supabase/supabase-js` (v2.119.0) prints a
`console.warn` — "Node.js 20 and below are deprecated…" — once per worker process during
`next build` whenever it runs on Node ≤ 20. It only stops on **Node ≥ 21**, and because it is
a plain `console.warn` (not a process warning) there is **no opt-out flag** — `NODE_NO_WARNINGS`
does not catch it. It is output noise, not a correctness or performance problem, but it floods
every build scan. Node 20 is also approaching end-of-life.

Lane B (registry workstream) shipped a **local-only cosmetic** mitigation — `scripts/filter-noise.mjs`
plus `npm run verify`, which strips the line from local scans without masking the real exit code
(ADR-0006's gate is unchanged; CI logs still carry the line) — and explicitly flagged the real
fix to the CI/CD workstream, which owns the workflows (ADR-0016). **This ADR is that fix.**

Forces in tension: silence the warning at its source vs. toolchain churn; stay on a supported
runtime; keep CI green and the free-plan Actions footprint small; and **do not break the local
sandbox**, which is pinned at Node 20.11.0 and not upgradeable here.

## Decision

1. **Bump `node-version: "20"` → `"22"` in all three workflows** (6 occurrences: `ci.yml` ×2,
   `skills-gate.yml` ×3, `arch-gate.yml` ×1). `actions/setup-node@v4` installs Node 22 on the
   runner regardless of the host, so this is sufficient to move CI onto 22.
2. **Add a root `.nvmrc` = `22`** so local toolchains that honor it (nvm, Volta, fnm) match CI.
   It is a hint, not a hard gate.
3. **Do NOT add a hard `engines` floor** (e.g. `"engines": { "node": ">=22" }`) while the dev
   sandbox is pinned at Node 20.11.0 — with `engine-strict` it would break `npm ci` locally.
   Revisit when the sandbox can run Node ≥ 22.
4. **Leave `@types/node` at `^20` for now.** Type defs older than the runtime are harmless
   (newest-API types are simply absent, not wrong); bump opportunistically.
5. **Keep `filter-noise.mjs` / `npm run verify`.** On Node 22 the supabase warning disappears at
   the source, so the filter becomes a no-op — kept because it still strips any _future_ known-
   harmless line without masking exit codes. Update the BUILD-RULEBOOK note to say the toolchain
   is now Node 22.

## Alternatives considered

- **Stay on Node 20 and rely on the local filter** — rejected: it hides the line in local scans
  only, CI logs still carry it, and it leaves the project on an EOL-bound runtime.
- **Jump to Node 24 / latest** — rejected: Node 22 is the current LTS line and already clears the
  `≥ 21` threshold that silences the warning; chasing newer risks tooling gaps for no gain.
- **Add a hard `engines` floor now** — rejected: breaks `npm ci` on the Node-20 sandbox under
  `engine-strict`; the `.nvmrc` hint plus this ADR are the guard instead.
- **Suppress via `NODE_NO_WARNINGS` or an env flag** — rejected: it is a plain `console.warn`,
  not a Node process warning, so the flag does not catch it; no opt-out exists below Node 21.

## Consequences

- **Positive:** the supabase deprecation warning is gone at the source, in CI _and_ locally; the
  project is off EOL-bound Node 20 onto the current LTS; `.nvmrc` documents the expected local
  version; the local filter degrades to a safe no-op.
- **Negative (accepted):** CI now depends on Node 22 on the runner (available via `setup-node`).
  The Node-20 sandbox is now one major version behind CI — fine today (the app uses no Node-22-only
  APIs), but a future Node-22-only feature wouldn't surface locally until the sandbox upgrades.
  With no hard `engines` floor, nothing _blocks_ a build on an unsupported Node; the `.nvmrc` and
  this ADR are the guard, not an enforced gate.
- **Neutral:** `@types/node` stays `^20` (harmless); no application code changes; the three-workflow
  structure and ADR-0016's every-push behavior are unchanged.
