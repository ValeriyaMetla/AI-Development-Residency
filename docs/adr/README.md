# Architecture Decision Records (ADRs)

Short records of decisions that are **costly to reverse** — one file per decision — so the
_why_ behind a choice (and the alternatives rejected) survives past any single chat session.
The code and docs show _what_ the project is now; an ADR records _why_, so a future session
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
  deliberately _not_ recorded as an ADR — it is a trivial, easily-changed convention.

## Index

- [ADR-0001](0001-category-aware-routing.md) — Skill routing is a forced, category-aware check
- [ADR-0002](0002-defer-ci-quality-gate.md) — Defer the CI quality gate to the app-building weeks _(superseded by ADR-0006)_
- [ADR-0003](0003-internal-server-layering.md) — Internal server code follows Service → Domain → Data-Source layers
- [ADR-0004](0004-repository-layout.md) — Repository layout: app in studio/, process docs in docs/, specs in Notion
- [ADR-0005](0005-material-ui.md) — Use Material UI as the UI component library (supersedes Build-Plan ADR-33)
- [ADR-0006](0006-ci-quality-gate.md) — Stand up the CI quality gate: lint · format · types · tests · build · dependency + secret scan (supersedes ADR-0002)
- [ADR-0007](0007-signup-provisioning-trigger.md) — Provision org + profile at sign-up via a SECURITY DEFINER trigger
- [ADR-0008](0008-standards-library-data-model.md) — Standards library data model: `standard` + `standard_rule` as a read-only catalog
- [ADR-0009](0009-policy-seed-data-model.md) — Policy-seed data model: org-owned `policy` / `policy_rule` / `policy_seed_response`
- [ADR-0010](0010-copilot-risk-tiering.md) — Governance Co-Pilot: transparent risk-tiering as deterministic Domain code
- [ADR-0011](0011-use-nextjs-with-typescript.md) — Use Next.js (App Router) with TypeScript
- [ADR-0012](0012-host-on-vercel.md) — Host and deploy on Vercel
- [ADR-0013](0013-use-supabase.md) — Use Supabase for database, auth, and row-level security
- [ADR-0014](0014-policy-rule-check.md) — Policy rule-check is deterministic, category-driven code (not an LLM judge)
- [ADR-0015](0015-self-critique-pass.md) — Self-critique is a model-based Challenger pass with a bounded re-draft, behind the deterministic rule-check
- [ADR-0016](0016-week-5-ci-safety-gates.md) — Run CI on every branch, gate-check the Claude Skills (structure + library-sync), and trace checks to Week-2 BDD (extends ADR-0006)
- [ADR-0017](0017-self-host-roboto-font.md) — Self-host the Roboto font via @fontsource instead of next/font/google (removes the flaky build-time Google Fonts fetch)
