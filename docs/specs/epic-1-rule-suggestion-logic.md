# Spec — Rule-Suggestion Logic from the Registry (v0.1, draft)

**Epic:** 1 — Set Your Rules (with Epic 2 — Registry) · **Features:** Living policy · Rule suggestions
**Release:** 1b · **Chunk:** 4 — Living policy
**Status:** v0.1 draft for review · **Last updated:** 2026-11-18
**Doc type:** Reference (the logic and its contracts), with a clearly separated design-rationale section.

**Source tickets (exact titles):**

- "Design rule-suggestion logic from registry" — this spec *is* that card's deliverable.
- "Detect recurring patterns from the registry" — implements §3–§4.
- "Surface candidate rule suggestions (dedup)" — implements §5–§6.
- "Build \"accept suggested rule\" flow" — implements §7.

**Decision record:** [ADR-0025](../adr/0025-rule-suggestions-from-registry.md) records the costly-to-reverse parts — the signal
storage (§3), the decision table and the `suggested` origin (§6–§7).

**Grounding:** reads the registry recorded by the governed-run pipeline
([`pipeline.ts`](../../studio/lib/domain/pipeline.ts)) and the risky-use / PII detectors
([`risky-use.ts`](../../studio/lib/domain/risky-use.ts), [`pii.ts`](../../studio/lib/domain/pii.ts)).
Accepting a suggestion publishes a new policy version through the existing path (ADR-0024,
[`policy-publish.ts`](../../studio/lib/domain/policy-publish.ts)). Suggested rule wording follows the
[plain-language rule format](epic-1-plain-language-rule-format.md), which already reserves the
`suggested` origin for this feature (§3 of that spec).

---

## 1. Purpose

> As the product, we want a defined way that recurring usage patterns become suggested new rules,
> so that policy grows from real use (governance by doing). *(Source: "Design rule-suggestion logic
> from registry" user story.)*

The living policy notices when the organization keeps doing a kind of AI task that its rules don't
yet speak to, and **proposes** a rule for the Accountable Leader to consider. It never adds a rule
on its own.

## 2. The pipeline at a glance

```
registry (audit_event metadata)            ← read-side only, org-scoped by RLS
  → detect: count runs per suggestion key over a 30-day window        (card: Detect…)
  → keep keys at/above the threshold (3)
  → map each key to its pre-written candidate rule (the catalog, §5)
  → dedup: drop keys the org has already decided on (§6)              (card: Surface… (dedup))
  → show to the Accountable Leader with count-only evidence
  → leader accepts (optionally editing the text) or dismisses         (card: Build "accept…" flow)
      accept  → publish a NEW policy version with the rule added (ADR-0024) + record the decision
      dismiss → record the decision (never re-suggested)
```

Everything before the leader's decision is **deterministic, pure, and inspectable** — no model call.

## 3. Signals — what counts as a "use type"

A **suggestion key** names one recurring use type. v1 reads two signals, both from `audit_event`
payloads (non-sensitive metadata by design, ADR-0006):

| Signal | Keys | Source | Status today |
|---|---|---|---|
| Risky-use patterns | `risky:<pattern id>` (ids from `RISK_PATTERNS` in `risky-use.ts`) | `risky_use_flagged` event payload `{ patterns: string[] }` | **Needs a pipeline change** — the payload is `{}` today (see below) |
| PII categories in input | `pii:<category>` (`PiiCategory` in `pii.ts`) | `pii_stripped` and `pii_kept` event payloads `{ categories: string[] }` | Already recorded |

**Pipeline change (approved D1; shared spine — sequence with Val).** `runGovernedSkill` writes the
detected pattern ids into the existing `risky_use_flagged` audit payload: `{ patterns: [...ids] }`.
No migration (payload is `jsonb`). Ids only — never the input text. **Forward-only:** runs recorded
before the change carry `{}` and are simply not counted.

**Not signals in v1:** per-Skill run counts (only two Skills exist, so they carry almost no
information) and Co-Pilot risk signals (leaders' own questions rather than staff use; deferred —
YAGNI). Either can be added later as new key prefixes without changing the rest of this spec.

## 4. Detection — threshold and window

- **Unit counted:** distinct **runs** carrying a key. A run with three SSNs counts once for
  `pii:us_ssn`; one run may count toward several keys. `pii_stripped` and `pii_kept` both mean the
  category was present, so either counts (a run with both counts once).
- **Window:** rolling **30 days** ending now.
- **Threshold:** **≥ 3** runs in the window → the key is a **pattern candidate**.
- **Where the numbers live:** two named constants in one Domain module
  (`SUGGESTION_WINDOW_DAYS = 30`, `SUGGESTION_MIN_RUNS = 3`). Not user-configurable in v1.
- **Unknown keys are ignored:** a pattern id or category not in the catalog (§5) is never surfaced
  (e.g. an old id after a detector rename).

*Assumption (living):* 3-in-30-days suits low nonprofit volume; revisit once real usage exists.

## 5. The suggestion catalog — what each key proposes

Each surfaced key maps to **one pre-written rule** authored in code. Wording follows the
plain-language rule format (one sentence, first person, present tense, no jargon). The citation
comes from the cited `standard_rule` in the catalog — **never generated**. The rule's `category` and
`risk_tier` are inherited from that standard (as the seed generator does, ADR-0009).

| Key | Proposed rule text | Grounding (`standard_rule` code) |
|---|---|---|
| `risky:medical` | We don't use AI to give medical advice, and a person checks any health-related draft before it is used. | `euaiact-human-override` |
| `risky:legal` | We don't use AI to give legal advice, and a person checks any legal-related draft before it is used. | `euaiact-human-override` |
| `risky:benefits-housing` | A person decides anything about someone's housing, benefits, or immigration situation, and AI only helps with drafting. | `euaiact-human-override` |
| `risky:safety-crisis` | When a task involves someone's safety or a crisis, a person handles it directly and AI is not used to respond. | `euaiact-human-override` |
| `risky:decision-about-person` | A person makes every hiring, admission, or eligibility decision, and AI only helps prepare supporting material. | `euaiact-human-override` |
| `pii:us_ssn` | We never put Social Security numbers into AI tools. | `iso42001-data-governance` |
| `pii:credit_card` | We never put payment card numbers into AI tools. | `iso42001-data-governance` |

**Deliberately not in the catalog (never surfaced):**

- `risky:ranking-people` — already prohibited by the locked baseline rule "We won't use AI to score,
  rank, or judge people…". Repeated hits mean staff are attempting a prohibited use: a coaching
  signal (Chunk 5), not a missing rule.
- `pii:email`, `pii:phone` — routine contact details in everyday tasks (e.g. donor notes); already
  stripped by default and flagged by the contact-detail check (ADR-0014). Suggesting a rule would be
  noise.

## 6. Dedup — when a suggestion is "already covered"

**Rule:** a key is covered, and never surfaced, once the org has **recorded a decision** on it —
accepted *or* dismissed — in `rule_suggestion_decision` (§7).

- This single check satisfies both "skip patterns an existing rule covers" (card: Surface… (dedup))
  and "dismissals are remembered so it isn't re-suggested" (card: Build "accept…" flow).
- An accepted suggestion stays covered even if the leader later retires that rule in the editor —
  retiring is itself a decision; the pattern is not re-suggested.
- **Honest limit:** a rule the leader wrote by hand that happens to address a pattern is *not*
  recognized as covering it (rule text is not machine-comparable; ADR-0014's reasoning). The leader
  dismisses that suggestion once, and it never returns.
- **Why not by category:** every seeded policy carries locked baseline rules in `data-protection` and
  `human-oversight`, so category matching would mark every suggestion as covered and nothing would
  ever surface. (See §10.)

## 7. The human decision and what it writes

Only the **Accountable Leader** sees and acts on suggestions (role checked server-side, as
`publishRuleEdits` does). Nothing is added without their explicit action.

**Accept** (optionally after editing the text):

1. Publish a **new policy version** through `publishEditedPolicy` (ADR-0024): the current rules carry
   forward unchanged, plus the suggested rule as an addition with `origin = 'suggested'`, its
   `suggestion_key`, the catalog `standard_rule_id` + snapshotted `citation`, and the inherited
   `category` / `risk_tier`. Edited text is validated like any edit (trimmed, non-empty,
   ≤ `MAX_RULE_TEXT`).
2. Append a `rule_suggestion_decision` row: `decision = 'accepted'`, the key, who, when, and the new
   `policy_id`.
3. The next governed run inherits the rule (ADR-0009) — verified the same way as "Verify a rule
   change propagates".

**Dismiss:** append a `rule_suggestion_decision` row with `decision = 'dismissed'`. No policy change.

**Data model (ADR-0025):**

- New table `rule_suggestion_decision` — `id`, `org_id`, `suggestion_key text`,
  `decision` enum (`accepted` | `dismissed`), `decided_by` → `profile`, `policy_id` (nullable; set on
  accept), `created_at`. Org-scoped RLS, **append-only** (SELECT + INSERT; no UPDATE/DELETE — same
  posture as `approval` and `run_correction`).
- `policy_rule_origin` enum gains `suggested` (reserved by the rule-format spec); `policy_rule`
  gains nullable `suggestion_key text`. Later edits carry both forward, as edits already carry
  `origin`.
- One migration, timestamped after `20261118040000`.

**Out of scope for v1:** un-dismissing a suggestion. If needed later, it appends a new decision; it
never deletes the old one.

## 8. Data governance and privacy

- **Reads metadata only:** `event_type`, `payload` (ids / categories), `created_at`. Never
  `task_output`, `input_summary`, rule text from runs, or any free text.
- **No "who":** the read does not select `actor` or `run_by`. Evidence describes the organization's
  pattern, never an individual — suggestions must not become a way to monitor staff.
- **Evidence shown** is the count and the window only, e.g. *"Health-related tasks — 4 times in the
  last 30 days."*
- All reads and writes run as the signed-in user under existing org-scoped RLS; no service-role key.

## 9. Acceptance and quality checks (testable, code-graded)

Suggestion quality is measured with deterministic checks on a fixed set of fixture registries
(ai-evaluation: code-based graders first). Each line maps to a card's acceptance criterion.

**Detect** — *Given* 3+ runs with the same key in 30 days, *When* detection runs, *Then* that key is
a pattern candidate. *Given* 2 runs, or 3 runs with one older than 30 days, *Then* it is not.
*Given* one run carrying a key in both `pii_stripped` and `pii_kept`, *Then* it counts once.

**Design** — *Given* a candidate key with no decision recorded, *When* the logic runs, *Then* it
emits exactly one proposal with the catalog text, a resolvable citation, and count-only evidence.
*Given* a key not in the catalog (incl. `risky:ranking-people`, `pii:email`), *Then* nothing is
emitted.

**Dedup** — *Given* a key with an `accepted` or `dismissed` decision, *When* suggestions are
generated, *Then* it is not surfaced.

**Accept / dismiss** — *Given* a proposal, *When* the leader accepts it, *Then* a new active policy
version contains the rule (origin `suggested`), a decision is recorded, and the next run is grounded
in it. *When* the leader dismisses it, *Then* it is not re-suggested. *Given* a non-leader, *Then*
both actions are refused server-side.

**Privacy guards** — every emitted proposal's evidence contains only `{ key, count, windowDays }`;
the detection read selects no actor, user id, or free-text column.

## 10. Where the code lives (ADR-0003)

| Layer | File | What |
|---|---|---|
| Data-Source | `lib/data/suggestions.ts` *(new)* | Read audit metadata in the window; read/append decisions |
| Domain (pure) | `lib/domain/rule-suggestions.ts` *(new)* | Constants, catalog, counting, threshold, dedup, proposal shape |
| Domain | `lib/domain/policy-publish.ts` / `policy-edit.ts` | Accept reuses publish; additions gain origin/key/citation |
| Service | `app/(app)/policy-seed/actions.ts` (or a sibling) | Leader-only accept / dismiss actions |
| Presentation | the policy page | Suggestion list, evidence, edit, accept, dismiss |

**Shared spine touches (sequence with Val):** `pipeline.ts` (the `patterns` payload, §3) and
`lib/data/policy.ts` (`insertPolicyRules` writes `suggestion_key`).

---

## Design rationale (explanation)

- **Deterministic, not an LLM.** The card asks for "deterministic, inspectable logic (not a black
  box)". A leader can read exactly why a suggestion appeared (a key, a count, a window) and where
  its wording came from (a cited standard). Generated rule text would also risk fabricated
  citations (responsible-ai).
- **Audit payloads as the source.** They are already designed to be non-sensitive (ADR-0006) and
  org-scoped, so detection needs no new read of run content. The alternative — parsing
  `guardrail_check.reason_plain` sentences — breaks silently whenever a reason is reworded.
- **Decision-based dedup over rule matching.** Matching plain-language rule text is not reliable
  deterministically; category matching suppresses everything (§6). Recording the leader's decision
  is exact, explainable, and also delivers the dismissal memory the accept card requires.
- **Pre-written catalog over free generation.** Keeps every proposed rule readable, grounded, and
  reviewable in code review; the leader can still reword before accepting.
- **No individual attribution.** Counting runs per organization serves the policy; attributing
  them to people would turn a governance aid into staff surveillance.

## Open assumptions (to revisit with real usage)

- The threshold (3) and window (30 days) values.
- Whether `pii:email` / `pii:phone` should ever surface (e.g. for Skills where contact details are
  unusual).
- Whether Co-Pilot signals become a third source.
- Whether leaders need a way to see and re-open dismissed suggestions.
