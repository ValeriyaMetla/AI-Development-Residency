---
name: judge-arch
description: Reviews a code change (a diff or PR) for architectural integrity before it is called done or merged, against four questions — is the code in the right place (layering), who owns the data (single source of truth), what does it depend on (coupling/dependency direction), and what happens when it breaks (resilience). Use when reviewing a diff, PR, or new code for architecture, separation of concerns, layer boundaries, data ownership, dependency direction, or error/failure handling; before marking app work done or opening a pull request; or when asked whether code is in the right layer or whether a UI component is talking to the database directly. Enforces the three-tier / Service to Domain to Data-Source boundaries and the four enterprise promises (reliability, scalability, maintainability, security). Do NOT use for test coverage or general code-review quality (use testing-code-review), for OWASP/security specifics (use secure-coding), or for planning architecture up front (use technical-planning).
metadata:
  version: 1.0
---

# Judge-Arch — Architecture Review

## Intent

Enforce architectural integrity on every code change *before* it is called done or merged — the
generation-time half of the "quality sandwich" (it pairs with the `arch-gate.mjs` CI scanner).
Review the diff against four questions, block on a violation, and cite evidence rather than
asserting. Grounded in Fowler's layered architecture, the three-tier model, and the four
enterprise promises.

## The four questions (review every change against these)

1. **Q1 — Is the code in the right place? (layering)** Presentation (UI) holds no business or
   governance rules; the Domain layer owns the rules; the UI never touches the database
   directly; Domain and Data-Source never depend on Presentation. Verify with the **Leak Test**:
   could you swap the browser for a command-line script and keep every rule intact? *(ADR-0003.)*
2. **Q2 — Who owns that data? (single source of truth)** Every data fact has one authoritative
   home. No competing or un-synced duplicate stores; no writing to a table another context owns
   without an explicit API boundary; org-scoped data stays behind row-level security.
3. **Q3 — What does the new code depend on? (coupling)** Dependencies point one way (top-down),
   with no circular imports; external services (the AI model, the database) sit behind the
   Data-Source layer or an adapter, not scattered through the app; new third-party packages are
   deliberate and version-pinned; keep network calls coarse-grained, not chatty.
4. **Q4 — What happens when it breaks? (resilience)** Every async call, external fetch, database
   query, and serverless invocation states what happens on failure or a null result — explicit
   error handling, graceful degradation, and a visible error state. One isolated failure must
   never take down the whole app.

## Rules

5. **Cite evidence, don't assert.** State the file and line you checked and what you found; never
   claim a change passes without pointing to why. Unverified "looks fine" is a fail.
6. **On a violation, block and be specific.** Name the question that failed, the file/line, and
   the concrete fix (e.g. "Q1: `components/ThankYou.tsx` calls `supabase.from(...)` — move the
   query into `lib/data/` and call it from a server action").
7. **Match rigor to risk.** Weigh hardest on the guardrail pipeline, data-ownership, and failure
   paths; don't nitpick trivia.

## Checklist (before calling a change done / opening a PR)

- [ ] **Q1** layering clean — UI holds no rules, no direct DB calls (Leak Test passes)
- [ ] **Q2** one authoritative owner per data fact; no duplicate stores; org data behind RLS
- [ ] **Q3** one-way dependencies, no cycles; externals behind Data-Source; new deps pinned
- [ ] **Q4** failure and null handled on every async / fetch / DB / serverless path
- [ ] Verdict cites specific files/lines as evidence

## When unsure

If you can't tell which layer logic belongs in, apply the Leak Test (swap the UI for a CLI —
would the rule still fire?). If the concern is security-specific (injection, authz, secrets),
defer to [[secure-coding]]; if it's test coverage or general review quality, defer to
[[testing-code-review]]; if it's an up-front design choice rather than a review of a change,
that's [[technical-planning]] plus an ADR.

## Based on

- Martin Fowler — *Patterns of Enterprise Application Architecture* (layering; "First Law of
  Distributed Object Design" — don't make chatty network calls)
- Three-tier architecture and separation of concerns (enterprise application architecture)
- The four enterprise promises: reliability, scalability, maintainability, security
- Project: ADR-0003 (Service to Domain to Data-Source) and the Leak Test; the back-end half is
  `arch-gate.mjs` in CI (the quality sandwich, ADR-0002)

## Example

**Bad (Q1 + Q3 fail):** a React component `components/Donations.tsx` imports the Supabase client
and runs `supabase.from('task_run').select(...)` directly in a click handler — business data
access living in the Presentation layer, UI coupled straight to the database.

**Good:** the component calls a server action; the action (Service) calls `getTaskRuns(orgId)` in
`lib/data/` (Data-Source), which runs the query under the user's RLS context. The component only
renders state. The Leak Test passes — a CLI could call the same `getTaskRuns` with no UI.
