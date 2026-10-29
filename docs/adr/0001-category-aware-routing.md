# ADR-0001: Skill routing is a forced, category-aware check

- **Status:** Accepted
- **Date:** 2026-10-28

## Context
`CLAUDE.md` orchestrates which skills apply to a task. Two forces were in tension:

- **Reliability.** Claude tends to *under-trigger* skills (noted in `SKILLS-LIBRARY.md`).
  The original instruction was a passive "match the request against each description" —
  silent, so a skill that should have fired could be skipped with no trace.
- **Scale.** The library is growing from 17 toward ~29 planned skills across six
  categories. A "scan every skill in the flat list" instruction does not scale: heavy and
  noisy at ~29, and it directly contradicted the library's own rule, "enable only the
  skills a task needs, not the whole library."

## Decision
Make routing an explicit check run **before producing any deliverable**, in two passes:

1. **Place the task in one of the six categories** (`docs/SKILLS-LIBRARY.md`) and scan
   those categories' specialist skills.
2. **Regardless of category, always check the cross-cutting standards** — `secure-coding`,
   `testing-code-review`, `accessibility`, `ux-usability`, `documentation`.

Require a one-line routing statement naming the skills loaded and what fired them, and
making any exclusion explicit. Implemented in `CLAUDE.md` ("How to work in this project")
and cross-referenced in `SKILLS-LIBRARY.md`.

## Alternatives considered
- **Keep the passive flat scan** ("match each description") — rejected: silent
  under-triggering, and does not scale past ~20 skills.
- **Add a central router skill** (like the guide's `evals-start`) — rejected: `CLAUDE.md`
  already performs routing and is auto-loaded every session, so a router skill would
  duplicate it; a pick-one router also fights the compose-many design.
- **Category scan only, dropping the always-consult pass** — rejected: would reopen
  under-triggering for the highest-risk skills (security, accessibility, testing).

## Consequences
- **Positive:** routing stays cheap as the library grows; reliability preserved by the
  always-consult safeguard; `CLAUDE.md` and `SKILLS-LIBRARY.md` no longer contradict; the
  forcing function makes skipped skills visible.
- **Negative (the point):** the always-consult list is maintained by hand in `CLAUDE.md` —
  add a new cross-cutting standard and someone must add it there or it won't be
  force-checked. Category placement adds a small step to every deliverable turn. Routing
  depends on the category taxonomy in `SKILLS-LIBRARY.md` staying current.
- **Neutral:** this is instruction-strength enforcement, not a deterministic hook — the
  model can still deviate (accepted trade-off).
