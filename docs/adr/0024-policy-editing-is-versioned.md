# ADR-0024: Editing a policy publishes a new version; rules are never mutated in place

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

Epic 1 / Chunk 4 ("Living Policy") makes the seeded policy **editable**: the Accountable Leader
reads their org's AI rules in plain language and changes them — edit a rule's wording, add a custom
rule, retire one — so they "stand behind rules they actually understand."

The data model (ADR-0009) already supports versioning: `policy` rows are `draft` / `active` /
`archived` with **one active per org**, and `policy_rule` is **insert/select-only** (no UPDATE path
at the RLS level — a deliberate least-privilege choice). Every governed run stamps
`task_run.policy_id`, the exact policy that governed it, and that record feeds the funder-facing
audit trail (Epic 7).

"Edit a rule" can mean two very different things, and the choice is costly to reverse because it
decides whether the audit trail can quietly rewrite itself. This ADR records the decision.

## Decision

**Editing a policy produces a new policy version that is published by activating it; the existing
active version is archived, never mutated. `policy_rule` stays insert-only.**

1. **Edits assemble a new version.** The editor starts from the active policy's rules; the leader's
   changes (edited text, added custom rules, retired rules) are held until they **Publish**. On
   publish we `createPolicy` (the new version), `insertPolicyRules` (the full edited ruleset), and
   `activatePolicy` (archive the old active, activate the new) — the three writers that already
   exist. **No schema change, no new UPDATE path**; ADR-0009's insert-only `policy_rule` stands.
2. **Past runs keep their exact rules.** A prior run's `task_run.policy_id` still points to the
   archived version it was checked against, intact. Run-time provenance — "which rules applied when
   this task ran" — stays truthful for the audit trail, instead of drifting as rules change.
3. **No persisted mid-edit draft in this pass.** Edits live client-side until Publish; leaving
   without publishing discards them. A resumable server-side draft is a later enhancement (it would
   need a draft-rule write path we don't want to open yet).
4. **Baseline-safety rules are locked.** An `is_baseline_safety` rule can be neither edited nor
   retired in the editor — it carries into every new version verbatim (the always-on safety floor).
   This is stronger than the spec's "confirm to override" and matches the already-shipped rule list,
   which marks baseline rules "🔒 Locked — can't be turned off." The leader edits, retires, and adds
   only non-baseline rules; a tampered edit that names a baseline (or unknown) rule is rejected
   server-side.
5. **"Your rules" branches.** `/policy-seed` shows the rule viewer/editor when an org has an active
   policy, and the seed wizard when it has none — closing the "org already has a policy" gap the
   seed page left open.

## Alternatives considered

- **Edit `policy_rule` rows in place.** Rejected: it breaks run-time provenance (a past run's
  stamped policy would silently change under it), it reopens an UPDATE surface on a table we made
  insert-only on purpose (ADR-0009), and it would be the only place in the app that mutates history
  rather than appending — inconsistent with the audit log, approvals, corrections, and edited
  outputs, which all version.
- **Persist a server-side editable draft (resume mid-edit).** Deferred, not rejected: nicer UX for
  long edits, but it needs a write path for draft rules. Client-side-until-publish delivers the Must
  feature now without it; revisit when resume is worth the surface.

## Consequences

- **Positive:** reuses existing writers with no migration; the audit trail stays honest; the posture
  matches every other append/version decision in the app; baseline protection is explicit.
- **Negative (accepted):** no resume-mid-edit — unpublished edits are lost if the leader leaves
  (deferred); each publish creates a new policy + its rule rows (negligible at nonprofit edit
  frequency); the active policy's `id` changes on each publish (already handled — the pipeline reads
  the active policy fresh every run, ADR-0009 inheritance).
- **Neutral:** sets the pattern for all future policy mutation (suggestions-from-registry, imports)
  — they, too, publish versions rather than editing in place.
