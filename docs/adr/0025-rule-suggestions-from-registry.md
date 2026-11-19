# ADR-0025: Rule suggestions are deterministic, read from audit metadata, deduped by a recorded leader decision, and accepted as a new policy version

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

Chunk 4 ("Living policy") adds rule suggestions: the product notices recurring kinds of AI use in
the registry and proposes a rule for the Accountable Leader to accept or dismiss. Four cards cover
it — "Design rule-suggestion logic from registry", "Detect recurring patterns from the registry",
"Surface candidate rule suggestions (dedup)", and "Build \"accept suggested rule\" flow". The full
logic is specified in [`docs/specs/epic-1-rule-suggestion-logic.md`](../specs/epic-1-rule-suggestion-logic.md);
this ADR records the parts that are costly to reverse.

Forces in tension:

- **A thin "use type" signal.** Only two Skills exist, so per-Skill counts say almost nothing. The
  richest signal — which risky-use pattern fired (medical, legal, benefits-housing, …) — is **not
  stored**: the pipeline saves only a joined plain-language reason in `guardrail_check.reason_plain`,
  and the `risky_use_flagged` audit payload is `{}`. PII categories are already stored in the
  `pii_stripped` / `pii_kept` payloads.
- **Deterministic and inspectable vs. "smart."** The design card requires "deterministic,
  inspectable logic (not a black box)". An LLM could word suggestions or judge coverage, but would
  be non-deterministic and could fabricate citations.
- **What "already covered" means.** The dedup card says to skip patterns "an existing rule covers".
  Rule text is plain language and not machine-comparable (ADR-0014). Every seeded policy carries
  locked baseline rules in `data-protection` and `human-oversight`, so matching by category would
  mark every suggestion as covered and nothing would ever surface.
- **Remembering dismissals.** The accept card requires that a dismissed suggestion "isn't
  re-suggested endlessly" — a second write, beyond accepting.
- **Human control and the audit trail.** No rule may be added automatically, and policy changes
  must keep run-time provenance truthful (ADR-0024).
- **Staff privacy.** Counting use from the registry could drift into tracking individuals.

## Decision

**Rule suggestions are computed by deterministic Domain code from non-sensitive audit metadata;
each suggestion key maps to pre-written, standards-cited rule text; a key is suppressed once the
org records a decision on it (append-only); and accepting publishes a new policy version through
the ADR-0024 path, with the rule's origin recorded as `suggested`.**

1. **Signals come from `audit_event` payloads only.** Keys are `risky:<pattern id>` and
   `pii:<category>`. The governed-run pipeline adds the fired pattern ids to the existing
   `risky_use_flagged` payload — `{ patterns: [...] }` — ids only, no input text, no migration
   (the payload is `jsonb`). Counting starts from that change; earlier events (`{}`) are not counted.
   Per-Skill counts and Co-Pilot signals are not used in v1.
2. **Detection is pure and fixed.** Distinct runs per key in a rolling 30-day window; ≥ 3 runs makes
   a candidate. Both values are named Domain constants, not user configuration.
3. **Wording is a pre-written catalog in code, not generated.** Each surfaceable key maps to one
   plain-language rule citing a seeded `standard_rule` (citation snapshotted, category / risk tier
   inherited — the ADR-0009 pattern). Keys outside the catalog are never surfaced; the catalog
   deliberately excludes `risky:ranking-people` (already a locked baseline prohibition) and
   `pii:email` / `pii:phone` (routine contact details already stripped and flagged).
4. **Dedup is by recorded decision.** A new **append-only** table `rule_suggestion_decision`
   (`org_id`, `suggestion_key`, `decision` = `accepted` | `dismissed`, `decided_by`, nullable
   `policy_id`, `created_at`) under org-scoped RLS, SELECT + INSERT only — the `approval` /
   `run_correction` posture. A key with any decision row is never surfaced again. This one
   mechanism serves both the dedup card and the dismissal-memory requirement.
5. **Accepting reuses the versioned publish path (ADR-0024).** Accept → `publishEditedPolicy` with the
   suggested rule as an addition (text optionally edited by the leader, validated like any edit),
   then an `accepted` decision row carrying the new `policy_id`. Dismiss → a `dismissed` decision
   row only. No new write path for rules; `policy_rule` stays insert-only.
6. **Origin is recorded on the rule.** `policy_rule_origin` gains `suggested` (the value the
   plain-language rule-format spec reserved for 1b) and `policy_rule` gains a nullable
   `suggestion_key`, so a rule's provenance can read "Suggested from your usage"; later edits carry
   both forward.
7. **Leader-only, metadata-only, no individuals.** Suggestions are visible to and decided by the
   Accountable Leader only, enforced server-side. The detection read selects event type, payload ids
   / categories, and timestamp — never `actor`, `run_by`, input, or output — and evidence shown is a
   count and a window.

## Alternatives considered

- **Parse `guardrail_check.reason_plain` to recover risky-use patterns** — rejected: no spine edit,
  but it breaks silently the first time a reason sentence is reworded, and couples detection to
  display copy.
- **Add a structured pattern column or table for risky-use findings** — rejected for now: a schema
  change for a value the existing `jsonb` payload already carries; revisit if per-check linkage is
  needed (the reserved `guardrail_check.policy_rule_id` hook, ADR-0009).
- **LLM-generated suggestion text or an LLM coverage judge** — rejected: non-deterministic, harder to
  inspect, and able to fabricate citations; contrary to the card's "not a black box" requirement and
  ADR-0014's reasoning.
- **Coverage by rule category** — rejected: baseline `data-protection` and `human-oversight` rules
  exist in every seeded policy, so nothing would ever be suggested.
- **Coverage by matching rule text (exact or fuzzy)** — rejected: plain-language text is not
  reliably comparable in deterministic code; it would both miss and wrongly suppress suggestions.
- **Remember only dismissals, detect acceptance from the live policy** — rejected: if the leader
  later retires an accepted rule, the pattern would return as a suggestion despite a deliberate
  decision; one decision table is simpler and exact.
- **Auto-add high-confidence suggestions** — rejected outright: every card in this feature requires
  that nothing becomes a rule without the leader (responsible-ai human-in-the-loop).

## Consequences

- **Positive:** suggestions are explainable (a key, a count, a window, a cited standard) and fully
  unit-testable; no run content or individual attribution is read; dedup and dismissal memory are
  exact and share one mechanism; accepting a suggestion inherits ADR-0024's truthful provenance and
  ADR-0009's next-run inheritance with no new rule write path; the reserved `suggested` origin is
  finally used.
- **Negative (accepted):** risky-use counting is **forward-only** from the pipeline change; a rule
  the leader wrote by hand is **not** recognized as covering a pattern (they dismiss that suggestion
  once); a dismissed suggestion cannot be reopened in v1; the catalog must be maintained by hand
  when detectors gain new patterns (an unknown key is ignored, never surfaced uncited); the change
  touches two shared spine files (`pipeline.ts`, `lib/data/policy.ts`), which must be sequenced
  across Lane A sessions.
- **Neutral:** one migration (new enum value, a nullable column, one table), timestamped after
  `20261118040000`; threshold and window are assumptions to revisit with real usage; Co-Pilot
  signals or per-Skill counts can be added later as new key prefixes without changing this design.
