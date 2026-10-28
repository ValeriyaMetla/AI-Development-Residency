---
name: backlog-decomposition
description: Organizes a defined product scope into a navigable Epic → Feature → Task hierarchy and a groomed, prioritized backlog / Kanban board. Use when breaking a release scope, PRD, or scope-of-outcomes into epics, features, and tasks; building, structuring, or grooming a backlog or Kanban board; clustering outcomes into epics; deciding task granularity; or laying work out for delivery — even if the user doesn't say "skill." Owns the work-breakdown structure and backlog organization; consults product-specs for feature user stories + acceptance criteria, technical-planning for task breakdown, and mvp-scoping for the MoSCoW cut. Do NOT use for the PRD / what-and-why (use product-specs), the MVP bet or what-to-cut (use mvp-scoping), or architecture / ADRs (use technical-planning).
---

# Backlog Decomposition

## Intent

Turn a *defined* scope into a navigable work-breakdown — Epic → Feature → Task — and a groomed, prioritized backlog a team can pull from. This skill owns the *structure and organization*, not the content of each item; it follows the SAFe epic/feature/story hierarchy, INVEST, Scrum backlog refinement, and Kanban flow. It decomposes what [[product-specs]] and [[mvp-scoping]] defined, and reuses [[technical-planning]] for task breakdown.

## Decompose the scope into a hierarchy (don't invent)

1. **Start from a defined scope, not a blank page.** The input is an agreed scope, PRD, or scope-of-outcomes. If the *what* isn't settled, stop and fix it in [[product-specs]] / [[mvp-scoping]] first. Every epic, feature, and task must trace back to a scope item — decompose, never invent.
2. **Cluster outcomes into epics by value theme.** An epic is one coherent area of value (the "cabinet"), named by outcome, not by component or layer. Keep epics few and distinct; merge overlapping ones.
3. **Split each epic into features.** A feature is a deliverable slice of the epic (the "box"), sized to fit one release increment (SAFe). This skill owns the *split*; get each feature's user story + acceptance criteria from [[product-specs]].
4. **Break features into tasks at one consistent granularity.** Tasks are the "tools" — small, independently verifiable units. Pick a granularity (≈2–3 tasks/feature) and hold it across the backlog. Defer the task-sizing and dependency detail to [[technical-planning]].
5. **Give every cross-cutting capability a single home.** A capability several epics rely on (e.g., provenance, auth, logging) is specified once in one epic and *referenced* elsewhere — never duplicated across epics.

## Shape and prioritize the backlog

6. **Tag every item so the board is navigable.** Carry Epic, Feature, and the MoSCoW priority from [[mvp-scoping]] onto the board as filterable fields — don't bury priority in the title.
7. **Keep items INVEST-shaped** — Independent, Negotiable, Valuable, Estimable, Small, Testable — especially *Small* and *Testable* at the task level.
8. **Order by dependency and risk.** Sequence so each item builds on the last, and pull the riskiest or most uncertain item early so it fails fast while it's cheap to change.

## Keep it living

9. **Refine continuously, don't big-bang.** The backlog is a living artifact: groom items (add detail, order, size) as they rise toward the top, rather than fully specifying everything up front. New work enters the Backlog column; board columns and WIP follow Kanban flow.

## Checklist before calling it done

- [ ] Every epic / feature / task traces to a scope item (nothing invented)
- [ ] Epics are few, distinct, named by value; overlaps merged
- [ ] Features are sized to a release increment; each has a story + AC from [[product-specs]]
- [ ] Tasks are small, independently verifiable, at one consistent granularity
- [ ] Cross-cutting capabilities have a single home, referenced not duplicated
- [ ] Every item tagged with Epic, Feature, and MoSCoW priority
- [ ] Backlog ordered by dependency and risk (riskiest early)
- [ ] Items are INVEST-shaped

## When unsure

If you can't trace an item back to the scope, it's scope creep — cut it or return to [[product-specs]] / [[mvp-scoping]]. If an epic has only one feature, or a feature only one task, you've over-decomposed — collapse it. If the *what* is still fuzzy, stop decomposing and fix the spec first; a hierarchy built on a vague scope just multiplies the vagueness.

## Based on

- **SAFe (Scaled Agile Framework)** — the epic → feature → story hierarchy; features fit a program increment, stories a sprint
- **Bill Wake** — INVEST criteria for good backlog items
- **Scrum Guide (2020)** — product backlog refinement as ongoing grooming (detail, order, size)
- **David J. Anderson** — Kanban: board columns, flow, and work-in-progress limits
- Composes with [[product-specs]] (feature stories + acceptance criteria), [[technical-planning]] (task breakdown + sequencing), and [[mvp-scoping]] (the MoSCoW cut and MVP line)

## Examples

**Decomposition altitude — ❌ by component vs ✅ by value**
- ❌ Epic "Database" → Feature "Add users table" → Task "write SQL." *(Organized by implementation layer; not traceable to a user outcome; wrong altitude.)*
- ✅ Epic "AI-Use Registry & Visibility" → Feature "Automatic task logging" (story + AC from `product-specs`) → Tasks "design the log schema," "build auto-logging," "verify no sensitive content is stored." *(Organized by value, every item traces to a scope outcome, each task is verifiable.)*
