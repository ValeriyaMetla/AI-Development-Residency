# Build Rulebook — Release 1a

The working agreement for *how* we build Community AI Workflow Studio: the standing rules we
follow on every coding step, so quality and governance don't depend on remembering. A **living
doc** — rules are added one at a time as decisions land (see `BUILD-DECISIONS.md`), and each
rule cites the decision or ADR it came from.

> **Scope:** process/craft rules only. *What & why* lives in the Notion product specs; *costly
> architectural decisions* live in `docs/adr/`; *open decisions* live in `BUILD-DECISIONS.md`.

---

## Definition of Done

A feature or task is not "done" until every item here holds (automated where possible, else a
PR self-review checklist — Google's order: correctness → design → clarity).

- [ ] **Layer integrity — the Leak Test.** No business or governance rule lives in a
  presentation component. Before calling a feature done, apply the test: *could you swap the
  browser for a command-line script and keep every guardrail intact?* If you'd have to copy
  logic into the UI to do that, it's leaking out of the Domain/Service layers — move it
  server-side. *(Enforces [ADR-0003](adr/0003-internal-server-layering.md); pairs with Build
  Plan NFR-S1/S2. Decision D4.)*

*(More DoD items — provenance, human-review, PII handling, a11y, tests — will be added here as
their decisions are settled. Build Plan Step 7 is the source they'll distill from.)*

---

## Git workflow

- [ ] **One branch per decision/change.** Branch from the latest `main`
  (`git checkout main && git pull`, then `git checkout -b <short-name>`). **Never reuse a branch
  that has already been merged** — start a new one.
- [ ] **One PR per branch, merged once.** Open a single PR for the branch, merge it once, then
  delete the branch. (Turn on GitHub's *Settings → General → "Automatically delete head
  branches"* so merged branches clean up on their own.)
- [ ] **Never commit straight to `main`.** Every change lands via a PR. *(Build Plan ADR-21,
  NFR-T3.)*
- [ ] **Commit messages:** imperative subject line, then a short body explaining *why*; include
  the AI co-author line on AI-assisted commits.

> **The clean loop, every time:** `main` → `git pull` → new branch → commit → push → one PR →
> merge → delete branch → back to `main`.

---

## Pre-PR architecture review (the 4 questions)

Before opening a PR, review the diff against these four questions — the human/AI layer of the
"quality sandwich." *(At Phase 0 these become the automated `arch-gate.mjs` CI scanner and a
`judge-arch` skill — see decisions D10/D7.)*

- [ ] **Q1 — Is the code in the right place?** Logic sits in its proper layer: Presentation
  (UI) holds no business/governance rules; the Domain layer owns the rules; the UI never
  touches the database directly. *(This is the Leak Test — [ADR-0003](adr/0003-internal-server-layering.md).)*
- [ ] **Q2 — Who owns that data?** Every data fact has one authoritative home. No competing
  duplicate stores, and no writing to a table another context owns without an explicit API.
  *(Org-scoped data stays behind RLS — Build Plan ADR-9 / NFR-SEC2.)*
- [ ] **Q3 — What does the new code depend on?** Dependencies point one way (top-down, no
  circular imports); external services (Claude, Supabase) sit behind the Data Source layer
  rather than scattered through the app; new third-party packages are deliberate and pinned.
- [ ] **Q4 — What happens when it breaks?** Every async call, external fetch, DB query, or
  serverless call states what happens on failure or a null result — no unhandled paths,
  graceful degradation, a visible error state. *(The Reliability promise — our lightest so
  far; see D6.)*

