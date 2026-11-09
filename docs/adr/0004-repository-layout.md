# ADR-0004: Repository layout — app in studio/, process docs in docs/, specs in Notion

- **Status:** Accepted
- **Date:** 2026-11-08

## Context
The monolith decision (Build Plan ADR-1) commits to one language, one repo, one deploy. The
`AI-Development-Residency` repo already holds the skills library and `docs/`, and the Week 2
product specs live in Notion. The app now needs a home, and the build/process docs (ADRs, the
build rulebook, the decisions log) need one obvious place.

Forces in tension:
- **Keep one repo** (the monolith choice) rather than splitting the app out.
- **Keep the app self-contained** so it isn't tangled with the skills-library files already in
  the repo.
- **Process docs want to travel with the code** — version-controlled, editor-openable,
  PR-reviewable — because they describe how the code is built.
- **Product specs are already maintained in Notion** with their own editing workflow;
  duplicating them into the repo risks drift.

## Decision
- **App code** lives in a **`studio/`** subfolder of the repo (one repo, per ADR-1).
- **Build/process docs** (ADRs, build rulebook, decisions log) live in the repo under
  **`docs/`** — version-controlled alongside the code and reviewable via PR.
- **Product specs** (Vision & Scope, Epics, Build Plan, NFRs, Kanban) remain the **source of
  truth in Notion**.
- The decisions log **may be mirrored to Notion** for reading, but the repo copy stays the
  source of truth for process docs.

## Alternatives considered
- **A separate repo for the app** — rejected: contradicts the one-repo monolith (ADR-1) and
  adds cross-repo overhead for a solo build.
- **App at the repo root (no subfolder)** — rejected: mixes app code with the existing
  skills-library and docs; a subfolder keeps the app self-contained and easy to extract later
  if ever needed.
- **Move product specs into the repo as Markdown** — rejected: they're actively edited in
  Notion; duplicating them invites drift. Keep a single source where they already live.
- **Keep process docs in Notion too** — rejected: ADRs and the rulebook should be
  version-controlled with the code and gated by PR, since they govern how the code is built.

## Consequences
- **Positive:** the monolith stays intact; the app is self-contained in `studio/`; process
  docs are PR-reviewable and travel with the code; specs stay where they're maintained; there's
  now a clear rule for "where does X live."
- **Negative (the point):** "documentation" has two homes (Notion specs vs repo process docs),
  so you must know which is which — this ADR states the split to mitigate that. A `studio/`
  subfolder also means deploy config (Vercel's "root directory") must point at `studio/`, a
  small extra setup step.
- **Neutral:** `studio/` is a name, cheap to rename now but costly once CI/Vercel are wired;
  the Notion mirror of the log is optional and non-authoritative. Extends ADR-1; supersedes
  nothing.
