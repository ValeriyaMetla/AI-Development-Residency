# ADR-0010: Governance Co-Pilot — transparent risk-tiering as deterministic Domain code

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The Governance Co-Pilot (Epic 4, the Release 1a hero) answers "should we use AI for this, and
how?" with a `use` / `use-with-conditions` / `don't` recommendation. That verdict can steer whether
a nonprofit sends an AI-drafted message to a client in crisis, or whether donor data reaches a
model — so it is a **consequential advisory decision about which the product's whole credibility
turns**. A black-box model verdict ("this is high-risk, trust me") cannot be explained to a funder
or board, cannot be audited, and is not reproducible.

The Co-Pilot also depends on existing foundations: the governed-run pipeline (ADR-0003 / Build-Plan
ADR-11), the standards library (ADR-0008), and the org's active policy with inheritance (ADR-0009:
`getActivePolicy` + `getPolicyRules`, `policy_rule` carrying `standard_rule_id` + snapshotted
`citation` + `is_baseline_safety` + `origin`). The full design is in
[`docs/design/epic-4-copilot-design.md`](../design/epic-4-copilot-design.md); this ADR records the
costly-to-reverse decisions.

## Decision

1. **The risk tier is decided by deterministic Domain-layer code, never by the model.** A fixed,
   first-match signal→tier table assigns the tier; the LLM is used only to *explain* the verdict in
   plain language and *draft the safer-way*. The model is downstream of the verdict and can never
   move it.
2. **Four tiers, aligned to the EU AI Act** (Reg. (EU) 2024/1689): `prohibited` → `don't`,
   `high` → `use-with-conditions` (or `don't` if irreducible), `limited` → `use-with-conditions`
   (light), `minimal` → `use`; plus `undetermined` → `out_of_scope` (defer to a human, never a fake
   tier).
3. **Signals are captured via "Option C"**: the three highest-stakes signals — *judges/ranks a
   person*, *high-stakes domain*, *sensitive personal data* — are **asked directly** (a structured
   step the model cannot silently skip); *banned purpose* and *output leaves the org* are
   model-inferred and shown. Unknown/ambiguous signals **round the tier up**, never down.
4. **The safer-way re-tiers**: each risk signal has a standards-grounded mitigation; applying the
   mitigations re-runs the engine to produce a **computed projected tier** shown to the leader.
   Irreducible signals (banned purpose; AI judging a person the leader won't restructure) → a clear
   `don't`; high-stakes domains keep human approval as a permanent floor.
5. **Grounding stacks two sources**: the standards library is the universal safety floor; the org's
   active policy is additive. **Policy tightens freely and may relax only above a hard floor** via
   logged, accountable risk acceptance — `prohibited`, the third rail, and `is_baseline_safety`
   rules never relax. Citations are **policy-first, standards-backed, standards-fallback**,
   **code-attached** from `policy_rule.citation` / `standard_rule.citation` — the LLM never writes
   or edits a citation (no fabrication).
6. **Persistence**: an assessment is a `task_run` (the `copilot` skill) plus an immutable
   `copilot_assessment` child (recommendation as `jsonb`), org-scoped via the parent (`task_output`
   /`task_run` RLS pattern), SELECT+INSERT only. Every assessment is logged to `audit_event` with no
   sensitive content (ADR-6).
7. **Pipeline fit**: the Co-Pilot **inverts** the governed-run pipeline to *assess-then-narrate* —
   deterministic tiering runs first in Domain, the LLM explains after — via a sibling
   `runCopilotAssessment` that reuses the shared Data-Source helpers rather than forking
   `runGovernedSkill`.
8. **The Co-Pilot advises; a named human decides.** Verdict/tier/safer-way/human-decision are always
   shown; `prohibited` is a hard refusal boundary; nothing is signalled by colour alone.

## Alternatives considered

- **LLM decides the tier (black-box verdict)** — rejected: not explainable, auditable, or
  reproducible; defeats the product's trust claim (and its own "risk-tiering stays plain code"
  rule, Build-Plan ADR-3).
- **3-tier scheme (tier = verdict 1:1)** — rejected: collapses the safer-way's "distance to travel"
  and is less recognizable than the EU AI Act ladder; the fourth tier costs almost nothing.
- **Form-only or pure free-text signal capture** — rejected: form-only loses the "just ask it" hero
  feel; pure free-text leaves a silent-false-negative gap on the highest-stakes signals. Option C
  (ask the top three, infer the rest) closes the gap while keeping most of the magic.
- **Policy may relax the hard floor** — rejected: turns an org's policy into an off-switch for
  safety; relaxation is bounded to `limited`/`high` with logged accountable acceptance.
- **Normalized assessment tables / generalized pipeline** — rejected for Release 1a: `jsonb`
  snapshot + a sibling pipeline function are simpler (YAGNI); revisit if reporting needs SQL
  queryability.

## Consequences

- **Positive:** every verdict is explainable and reproducible; citations cannot be fabricated; the
  safety floor cannot be disabled by policy; the pure-code verdict survives LLM and policy outages
  (only the standards floor is a hard dependency); consistent with ADR-0003 (layering), ADR-0008
  (standards), ADR-0009 (policy + inheritance), ADR-5/6 (audit).
- **Negative (the point):** the first release carries modest up-front friction (three yes/no
  questions) in exchange for defensibility; the deterministic tier table is a maintained artifact
  that must be kept in step with the standards library's `risk_tier` vocabulary; model-inferred
  signals (#1, #5) add an extraction-accuracy concern that evaluation must cover later.
- **Neutral:** the risk-acceptance record is specified to unify with Epic 5's human-approval table
  (not built twice); Epic 5's deterministic per-rule check remains separate and still to come.
