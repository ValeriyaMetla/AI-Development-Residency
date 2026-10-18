---
name: technical-planning
description: Enforces lightweight technical planning before coding — choosing the simplest stack that fits, recording significant choices as Architecture Decision Records (ADRs) with context, decision, and all consequences, and breaking a feature into small verifiable tasks. Use when choosing a stack or architecture, making a significant technical decision, structuring a project, writing an ADR, or turning a spec into an implementation plan. Do NOT use for the product WHAT/WHY (use product-specs) or MVP scoping (use mvp-scoping).
---

# Technical Planning

## Intent

Plan the *how* once the *what* is clear (see [[product-specs]]). Good planning is lightweight: pick the simplest design that meets the requirements, record the decisions that are expensive to reverse, and slice the work into small pieces you can verify. The goal is a plan someone else could pick up — not a large document no one reads. It follows lightweight Architecture Decision Record (ADR) practice (Nygard) and YAGNI.

## Choose the simplest thing that works

1. **Match the stack to the requirements, not the hype.** Prefer tools the team knows and that fit the spec's real constraints (scale, offline, budget, deadline). Boring and familiar beats novel and clever for a first version.
2. **Apply YAGNI — build for today's requirements.** Don't add abstraction, services, or configurability for needs that aren't in the spec yet. Solve the problem in front of you; you can refactor when a real need arrives.
3. **Keep the structure obvious.** Organize the project so a newcomer can find things by convention. Clear boundaries over clever indirection.

## Record significant decisions as ADRs

4. **Write an ADR for each decision that's costly to reverse** — the stack, a datastore, an interface or dependency, a non-functional trade-off. Skip ADRs for trivial, easily-changed choices.
5. **Use Nygard's five parts:** **Title** (names the decision, not the problem), **Status** (proposed / accepted / deprecated / superseded), **Context** (the forces at play — technical, team, time, cost — including the ones in tension), **Decision** (what you will do), **Consequences**.
6. **Record ALL consequences — positive, negative, and neutral.** The negatives are the point: they're the rationale a future reader needs so they don't unknowingly undo the decision. A plan that lists only upsides is hiding the trade-off.
7. **Note the alternatives you considered and why you rejected them.** This is the second-most valuable part of an ADR after the consequences.
8. **Keep ADRs short and in version control** (e.g. an `adr/` or `docs/decisions/` directory, one file per decision). Don't edit an accepted ADR to change the decision — write a new one that supersedes it, preserving the history.

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

## Break the work into small tasks

9. **Decompose the feature into small, independently verifiable tasks** before coding. Each task should be completable and testable on its own, ideally in a single commit or PR.
10. **Sequence by dependency and risk.** Order tasks so each builds on the last, and tackle the riskiest or most uncertain part early — fail fast while it's cheap to change course.
11. **Define "done" for each task** — what it produces and how you'll know it works (a passing test, a working endpoint). Ties into the verification standard in [[testing-code-review]].

## Checklist before calling a plan "done"

- [ ] The stack fits the spec's real constraints and the team knows it
- [ ] No speculative abstraction or scale built ahead of need (YAGNI)
- [ ] Each costly-to-reverse decision has an ADR
- [ ] Every ADR states context, decision, and ALL consequences (incl. negatives)
- [ ] Alternatives considered are recorded with the reason for rejection
- [ ] ADRs are short and in version control; superseded ones are kept
- [ ] The feature is broken into small, independently verifiable tasks
- [ ] Tasks are sequenced by dependency and risk, riskiest first
- [ ] Each task has a clear definition of "done"

## When unsure

If you're unsure whether a decision needs an ADR, ask whether reversing it later would be expensive — if yes, write one. If you're reaching for a more complex design "in case we need it," that's a YAGNI signal: build the simple version and record the simpler choice as a decision you can revisit. If the *what* is still unclear, stop and fix the spec ([[product-specs]]) before planning the *how*.

## Based on

- Architecture Decision Records — Michael Nygard (2011): Title, Status, Context, Decision, Consequences
- Joel Parker Henderson's ADR collection; lightweight ADR practice (one file per decision, in version control)
- YAGNI / "You Aren't Gonna Need It" and keep-it-simple design principles
- Task decomposition and risk-first sequencing — iterative delivery practice
