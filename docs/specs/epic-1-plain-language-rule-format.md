# Spec — Plain-Language Rule Format (v1.0)

**Epic:** 1 — Set Your Rules · **Feature:** Editable rule set · **Release:** 1a
**Status:** v1.0 · **Last updated:** 2026-11-13
**Doc type:** Reference (the format), with a clearly separated design-rationale section.

**Source ticket:** [Define the plain-language rule format](https://app.notion.com/p/407975c3b95081faaa66f3207bd55f6d)

**Grounding:** this format describes how a `policy_rule` row (ADR-0009,
[migration](../../studio/supabase/migrations/20261113020000_policy_seed_tables.sql)) is
*written and displayed*. It adds no schema — the fields already exist. Rule text is produced
by the generator per the [question-set spec](epic-1-policy-seed-question-set.md).

---

## 1. Purpose

> As the **Accountable Leader**, I want my org's AI rules written in plain language, so that I can
> read, understand, and edit rules I'm willing to stand behind. *(Source: ticket user story.)*

A rule is the atomic unit of a policy. Its format must let a non-technical leader grasp a rule at
a glance, see whether it's a locked safety baseline, and trace where it came from — so the policy
is something they genuinely own, not a black box.

## 2. How a rule reads (AC1 — Readable)

A rule's `rule_text` is **one self-contained, plain-language statement**:

- **One sentence, one idea.** A reader understands it without any other rule for context.
- **First person, present tense:** "We check AI output before acting on it." (Not "The system shall…")
- **No jargon or acronyms.** No framework names, section numbers, or technical terms in the rule
  text itself (those live in the provenance line, §3). Write "personal or sensitive information,"
  not "PII."
- **Concrete and actionable** — a person could tell whether they're following it.
- **Edit-friendly.** Because it's a single plain sentence with no embedded markup, a leader can
  reword it in the editor (1b) without breaking anything.

## 3. What the format carries, and how it displays (AC2, AC3)

Each rule is the plain sentence **plus** three display elements drawn from its `policy_rule` fields:

| Shown to the leader | From field(s) | Purpose |
|---|---|---|
| The rule sentence | `rule_text` | The rule itself (§2) |
| **🔒 Locked — non-overridable without confirm** *(only on baseline rules)* | `is_baseline_safety = true` | AC2: marks a safety baseline the org can't silently turn off |
| **"Needs review"** badge *(when set)* | `needs_review = true` | A safe default was applied to a skipped/"Not sure" answer; prompts a look |
| An **origin label** | `origin` (+ the display mapping, §4) | AC3: how the rule arose |
| A **provenance line:** "Based on [framework] — [citation]" | `standard_rule_id` + `citation` | AC3: the standard it derives from |

**Baseline-safety (AC2):** a rule with `is_baseline_safety = true` is shown with the 🔒 marker and
is **non-overridable without confirm** — in 1a there is no edit path, so it simply cannot be changed;
the DB-level guard arrives in 1b with the editor (ADR-0009). The three locked prohibited-uses (Q7)
and the always-on logging/records baselines are the baseline rules.

**Provenance (AC3):** a standards-derived rule shows its source framework and the snapshotted
`citation` (point-in-time, ADR-0009). A **custom** rule has no standard source, so it shows
"Added by your team" and no citation.

## 4. Origin labels (AC3) — and the reconciliation

The ticket names four origins — *seeded / edited / suggested / manual*. The 1a data model
(`policy_rule.origin`) has three — **`standard` / `baseline` / `custom`** — because editing and
suggesting don't exist yet. The format uses this **display mapping**, and reserves the 1b values:

| `origin` (1a enum) | Leader-facing label | Meaning |
|---|---|---|
| `standard` | **Seeded from a standard** | Generated from the seed, derived from a `standard_rule` |
| `baseline` | **Always-on safety baseline** | Seeded, locked, applies to every org |
| `custom` | **Added by your team** | A manual addition (the ticket's *manual*), no standard source |
| *(1b)* `edited` | **Edited by your team** | A seeded rule a leader reworded — **deferred to 1b** (needs the editor) |
| *(1b)* `suggested` | **Suggested from your usage** | Proposed by living-policy — **deferred to 1b** |

So the ticket's *seeded* maps to `standard` + `baseline`, *manual* maps to `custom`, and
*edited*/*suggested* are added to the enum when their features (rule editor, living policy) land.
This is a deliberate, documented deferral — not a gap.

## 5. Worked examples

**A seeded, locked rule (Q1 — accountable person):**
> **Jane Doe, Executive Director, is accountable for the organization's AI use and has the final
> say — AI assists, people decide.**
> 🔒 Locked — non-overridable without confirm · *Always-on safety baseline* · Based on NIST AI RMF
> (2023), GOVERN function

**A seeded rule applied by a safe default (Q3 — data governance, answered "Not sure"):**
> **We govern the data we put into AI: we minimize it, check its quality, and protect sensitive
> information.**
> Needs review · *Seeded from a standard* · Based on ISO/IEC 42001:2023, Annex A

**A custom rule (Q7 — team's own prohibition):**
> **We won't use AI to write performance reviews.**
> *Added by your team*

## 6. Acceptance-criteria check

| Ticket criterion | Met by |
|---|---|
| **Readable** — one plain-language statement, understandable + editable | §2 readability rules; `rule_text` is one markup-free sentence |
| **Baseline-safety marked** — non-overridable-without-confirm | §3 `is_baseline_safety` → 🔒 marker (enforced in 1a by no edit path; DB guard in 1b) |
| **Provenance-ready** — `origin` + source `standard_rule` | §3–§4: `origin` label mapping + `standard_rule_id`/`citation` provenance line |

## 7. Design rationale (explanation)

*Separated from the reference so the facts stay clean.*

- **Why no new schema.** `policy_rule` (ADR-0009) was designed with `is_baseline_safety`, `origin`,
  `standard_rule_id`, and snapshotted `citation` precisely so the format is a *presentation* concern,
  not a data change. This ticket formalizes the presentation.
- **Why defer `edited`/`suggested`.** They require the rule editor and living-policy features, both
  Backlog/1b. Adding enum values now would be unused (YAGNI); the mapping documents the path.
- **Why the 🔒 marker instead of DB enforcement in 1a.** There is no edit path in 1a, so baselines
  can't be changed regardless; the DB-level guard is 1b work tied to the editor (ADR-0009).

## 8. Sources

- Ticket (acceptance criteria quoted): linked at top.
- Data model: ADR-0009 and the policy-seed migration.
- Rule text production: the question-set spec (§3 rule templates).
