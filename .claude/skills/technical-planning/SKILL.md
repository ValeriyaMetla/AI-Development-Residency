---
name: technical-planning
description: Enforces lightweight technical planning and the build plan — the technical *how*, end to end. Choosing the simplest stack that fits and recording significant choices as Architecture Decision Records (ADRs); sequencing the build non-functional-before-functional (tooling → database → architecture → security → DevOps → quality → features) with a dependency spine and a walking skeleton; and writing the delivery specs — non-functional requirements ("the system shall… + binary pass/fail verification") and task-level technical requirements (acceptance conditions + BDD Given/When/Then + API & data-flow + UI annotations). Use when choosing a stack or architecture, making a significant technical decision, writing an ADR, writing a build plan, sequencing a release's build, turning a spec into an implementation plan, or writing non-functional or technical requirements. Do NOT use for the product WHAT/WHY (use product-specs) or the MVP bet/cut (use mvp-scoping).
metadata:
  version: 1.0
---

# Technical Planning

## Intent

Plan the *how* once the *what* is clear (see [[product-specs]]): **decide** the stack and architecture (recording costly choices as ADRs), **sequence** the build non-functional-first, and **specify** each piece as a testable delivery requirement. Lightweight beats comprehensive — a plan someone else could pick up, not a document no one reads. Grounded in ADR practice (Nygard), YAGNI, the agile build-plan convention (non-functional before functional), BDD, and INVEST.

## Choose the simplest thing that works

1. **Match the stack to the requirements, not the hype.** Prefer tools the team knows and that fit the spec's real constraints (scale, offline, budget, deadline). Boring and familiar beats novel and clever for a first version.
2. **Apply YAGNI — build for today's requirements.** Don't add abstraction, services, or configurability for needs that aren't in the spec yet. Solve the problem in front of you; refactor when a real need arrives.
3. **Keep the structure obvious.** Organize so a newcomer can find things by convention. Clear boundaries over clever indirection.

## Record significant decisions as ADRs

4. **Write an ADR for each decision that's costly to reverse** — the stack, a datastore, an interface or dependency, a non-functional trade-off. Skip ADRs for trivial, easily-changed choices.
5. **Use Nygard's five parts:** **Title** (names the decision, not the problem), **Status** (proposed / accepted / deprecated / superseded), **Context** (the forces at play — technical, team, time, cost — including the ones in tension), **Decision** (what you will do), **Consequences**.
6. **Record ALL consequences — positive, negative, and neutral.** The negatives are the point: they're the rationale a future reader needs so they don't unknowingly undo the decision.
7. **Note the alternatives you considered and why you rejected them.** The second-most valuable part of an ADR after the consequences.
8. **Keep ADRs short and in version control** (one file per decision). Don't edit an accepted ADR to change the decision — write a new one that supersedes it, preserving history.

### ADR template (copy this)

```markdown
# ADR-NNN: <names the decision, not the problem>

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
- **Date:** YYYY-MM-DD

## Context
<forces at play — technical, team, time, cost — including the ones in tension>

## Decision
<what we will do>

## Alternatives considered
- <option> — rejected because <reason>

## Consequences
- **Positive:** <what gets better>
- **Negative:** <the trade-off a future reader must know before undoing this>
- **Neutral:** <side effects that are neither>
```

## Sequence the build: non-functional before functional

9. **Build the foundation before the features — the house analogy.** The underground foundation and utilities (tooling, data, architecture, security, DevOps, QA) go in before the walls and paint (UI screens, flows). Shipping a feature on missing foundation is the costliest rework.
10. **Follow the build order:** tool/infrastructure selection → database architecture → system & network architecture → security protocols → DevOps (CI/CD) → quality engineering → functional delivery. Release-wide non-functionals (provenance, accessibility, etc.) ride along as a **Definition of Done** on every feature, not a late phase.
11. **Map the dependency spine — features are not build units.** Re-sort features by what-calls-what; pull shared infrastructure (guardrails, logging, auth) out as foundation built once; build the **walking skeleton** (the thinnest end-to-end slice that proves the riskiest assumption) first, then deliver in dependency-ordered, shippable phases.

## Write the delivery specs

12. **Non-functional requirements — one testable statement each.** Write each as *"the system shall…" + source + a binary pass/fail verification* that a CI check or quick inspection resolves green/red (deterministic enforcement over subjective review). Cover the six categories in order: tooling, data, architecture, security, DevOps, quality.
13. **Task-level technical requirements — four components per feature:** (a) **acceptance conditions** — backend rules, validation, system behavior that must hold for "done"; (b) **BDD** — Given/When/Then, happy *and* edge, convertible to tests; (c) **API & data flow** — endpoints, request/response formats, data schemas; (d) **UI annotations** — behavior, state, component rules (defer spacing/styling to the wireframe pass). Define **shared contracts once** (auth, errors, pipeline) and reference them.
14. **Treat every spec as a living assumption.** Agile requirements are iterative backlogs, not a 30-page upfront PRD; a tool, schema, or spec that fails once deployed is swapped, not defended. Size each task to **INVEST** (Independent, Negotiable, Valuable, Estimable, Small, Testable).

## Break the work into small tasks

15. **Decompose each feature into small, independently verifiable tasks** before coding — each completable and testable on its own, ideally one commit or PR. (For the full Epic → Feature → Task structure and backlog, hand off to [[backlog-decomposition]].)
16. **Sequence by dependency and risk.** Order tasks so each builds on the last, and tackle the riskiest/most uncertain part early — fail fast while it's cheap.
17. **Define "done" for each task** — what it produces and how you'll know it works (a passing test, a working endpoint). Ties into [[testing-code-review]].

## Checklist before calling a plan "done"

- [ ] The stack fits the spec's real constraints and the team knows it; no speculative scale (YAGNI)
- [ ] Each costly-to-reverse decision has an ADR with context, decision, ALL consequences, and alternatives
- [ ] The build is sequenced **non-functional-first** (foundation before features)
- [ ] The dependency spine + walking skeleton are identified; delivery is phased
- [ ] Non-functional requirements are written as *"shall" + binary pass/fail verification*
- [ ] Each feature carries the four task-level components (acceptance · BDD · API/data · UI)
- [ ] Specs are framed as living assumptions, not a locked upfront PRD
- [ ] Tasks are INVEST-sized, dependency/risk-ordered, each with a definition of "done"

## When unsure

If you're unsure whether a decision needs an ADR, ask whether reversing it later would be expensive — if yes, write one. Reaching for a more complex design "in case we need it" is a YAGNI signal. If you're sequencing and unsure what counts as "foundation," ask what other work *calls* it — shared services and data are foundation, built once. If a spec is getting long, that's an upfront-PRD smell — cut to the next slice. If the *what* is unclear, fix the spec ([[product-specs]]) before planning the *how*.

## Based on

- Architecture Decision Records — Michael Nygard (2011): Title, Status, Context, Decision, Consequences; Joel Parker Henderson's ADR collection
- YAGNI / KISS design principles
- Agile build-plan convention — non-functional before functional (house analogy); deterministic pass/fail enforcement over subjective review
- BDD Given/When/Then — Dan North; INVEST — Bill Wake
- Task decomposition and risk-first, iterative delivery
