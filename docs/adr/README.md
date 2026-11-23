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
- [ADR-0018](0018-no-active-policy-baseline-safety.md) — With no active policy, a governed run proceeds on baseline safety (discloses, does not block)
- [ADR-0019](0019-move-toolchain-to-node-22.md) — Move the toolchain and CI to Node 22 (silences the supabase Node-20 warning at the source; off EOL-bound Node 20)
- [ADR-0020](0020-human-approval-gate.md) — Human-approval gate: a flagged run is cleared by an org member's recorded, append-only approve/reject decision
- [ADR-0021](0021-run-correction-flow.md) — Entry correction is an additive, append-only annotation on a run — never an edit of the original record
- [ADR-0022](0022-reviewer-edit-and-provenance.md) — A reviewer may edit a flagged draft; edits append a new output version and provenance reflects human involvement (supersedes ADR-0020's no-edit scope)
- [ADR-0023](0023-free-tier-safety-and-capacity-only-premium.md) — Free = full safety net + oversight tools; premium = capacity only; no plan state can disable a safety step (Epic 8 / Lane D free-tier line + never-disable invariant + cost-payer attribute for future BYOK)
- [ADR-0024](0024-policy-editing-is-versioned.md) — Editing a policy publishes a new version; rules are never mutated in place (baseline rules locked)
- [ADR-0025](0025-rule-suggestions-from-registry.md) — Rule suggestions are deterministic, read from audit metadata, deduped by a recorded leader decision, and accepted as a new policy version
- [ADR-0026](0026-audit-insert-integrity.md) — The database stamps each audit entry's time and identity; app users may add only known kinds of event, as themselves, about their own organization
- [ADR-0027](0027-policy-load-failure-degrades-and-reviews.md) — When an active policy's rules can't be read, a run degrades to baseline, discloses it, and is forced to human review
- [ADR-0028](0028-review-decision-once-via-protected-function.md) — A run's review decision is made once, through one protected database step; members can no longer set a run's status directly (supersedes ADR-0020's re-review point; PenTest F-01, F-21)
- [ADR-0029](0029-demo-renders-from-sample-data-in-code.md) — The no-login demo renders from fixed sample data in code and never touches the database
- [ADR-0030](0030-ai-requests-rate-limited-by-protected-function.md) — AI requests are rate-limited by one protected database step that counts and records each request, and refuses when unsure (PenTest F-02; the run cap now fails closed)
- [ADR-0031](0031-policy-changes-leader-only-via-protected-functions.md) — Only an Accountable Leader can change an organization's policy, and activation happens in one protected all-or-nothing step (PenTest F-03, F-18; also closes direct rule inserts into the active policy)
- [ADR-0032](0032-policy-text-as-data-and-reviewed-imports.md) — Policy text reaches the AI as marked data, command-like rules are flagged, and an import is a reviewed draft that always keeps the safety rules (PenTest F-20, F-08)
- [ADR-0033](0033-session-limits-cookie-flags-and-security-headers.md) — Sessions end after 24 hours or 1 hour idle (app-side), the session cookie is HttpOnly and Secure, and every response carries a script-strict content security policy and hardening headers (PenTest F-05, F-06, F-09; corrects SR-08/09 to current NIST AAL2)
