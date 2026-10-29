# Architecture Decision Records (ADRs)

Short records of decisions that are **costly to reverse** — one file per decision — so the
*why* behind a choice (and the alternatives rejected) survives past any single chat session.
The code and docs show *what* the project is now; an ADR records *why*, so a future session
doesn't unknowingly undo a deliberate choice.

## Format
Follow the Nygard five-part template defined in the `technical-planning` skill:
**Title** (names the decision, not the problem) · **Status** (Proposed / Accepted /
Deprecated / Superseded) · **Context** · **Decision** · **Alternatives considered** ·
**Consequences** (record ALL of them — the negatives are the rationale a future reader needs).

## Conventions
- **Filename:** `NNNN-short-title.md` (zero-padded number + kebab-case title).
- **Don't rewrite history.** Never edit an accepted ADR to change its decision — write a new
  ADR that supersedes it, and set the old one's status to "Superseded by ADR-NNNN."
- **Skip trivial choices.** Per the `technical-planning` skill, ADRs are for costly-to-reverse
  decisions only. Example: the `metadata.version` normalization across all skills was
  deliberately *not* recorded as an ADR — it is a trivial, easily-changed convention.

## Index
- [ADR-0001](0001-category-aware-routing.md) — Skill routing is a forced, category-aware check
- [ADR-0002](0002-defer-ci-quality-gate.md) — Defer the CI quality gate to the app-building weeks
