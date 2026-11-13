# ADR-0009: Policy-seed data model — org-owned `policy` / `policy_rule` / `policy_seed_response`

- **Status:** Accepted
- **Date:** 2026-11-13

## Context
Epic 1 turns a leader's intake answers into an org's **starter AI policy**, grounded in the
standards library (ADR-0008) and auto-applied to later assessments. This needs new tables to hold
the policy, its generated rules, and the raw answers.

Unlike the standards library — a **global, read-only catalog** seeded once by a privileged
migration (ADR-0008) — policy data is **org-owned** and written **at runtime**, as the signed-in
user, by an LLM-backed generator. So it follows the existing **`task_run` tenancy pattern**
(org-scoped RLS via `current_org_id()`, ADR-9) within the data-source layer (ADR-0003), not the
catalog pattern. The [core schema](../../studio/supabase/migrations/20261110000000_phase0_core_schema.sql)
already reserved the downstream hooks (`task_run.policy_id`, `guardrail_check.policy_rule_id`) for
Phase 1.

Forces in tension:
- **Grounding/provenance** (every rule must cite its source `standard_rule`) vs **simplicity**.
- **Re-generation + audit history** (a governance product should keep records) vs **YAGNI**.
- **Org-write safety** (an LLM writes at runtime) vs **least privilege** (keep the service-role key
  out of app code, ADR-0007/ADR-12).
- **Settling the vocabulary** (Epic 1 fixed the categories → enums) vs **flexibility** (free text,
  ADR-0008's deliberate choice, tightened only when Epic 4 also settles its risk scheme).
- **The non-overridable baseline guarantee** vs the fact that **no edit path exists in Release 1a**.

## Decision
**Three org-owned tables**, under org-scoped RLS.

**`policy`** — the container (one rulebook; versioned-with-active):
- `id`, `org_id` FK -> `org`, `name`, `status` enum (`draft` | `active` | `archived`), `created_at`.
- **One active policy per org**, enforced by a *partial unique index* on `org_id` where
  `status = 'active'`. Re-generating creates a new row, marks it active, and archives the prior one
  (non-destructive).

**`policy_rule`** — the generated rules, **atomic** (one per source `standard_rule`):
- `id`, `policy_id` FK -> `policy`, `rule_text` (plain-language).
- `standard_rule_id` **nullable** FK -> `standard_rule` (null = a custom/leader-added rule).
- `citation` text — **snapshotted at generation** so the policy stays an accurate point-in-time
  record even if the catalog later changes.
- `category`, `risk_tier` — **free text** (inherited from the source `standard_rule`; consistent
  with ADR-0008).
- `origin` **enum** (`standard` | `baseline` | `custom`) — set by the app.
- `is_baseline_safety` bool (non-overridable flag), `needs_review` bool (safe-default applied),
  `source_question` nullable text (traceability).

**`policy_seed_response`** — the raw intake answers (one row per completed intake):
- `id`, `policy_id` FK -> `policy`, `answers` jsonb, `created_by` FK -> `profile`, `created_at`.
- **Insert + read only** — an immutable record of what was answered.

**Access (org-scoped RLS, `task_run` pattern):** reads/writes happen **as the signed-in user** via
`current_org_id()`; **no service-role key** in app code. Least privilege for Release 1a: `SELECT` +
`INSERT` on all three; `UPDATE` on **`policy` only** (status flips); **no `DELETE`**. `policy_rule`
and `policy_seed_response` are org-scoped **via their parent `policy`** (the `task_output`-via-
`task_run` pattern). DB-level enforcement of baseline non-overridability is **deferred to Release
1b** (when the rule editor exists to guard); in 1a it holds because no edit path exists.

**Reserved hooks deferred:** this migration does **not** add `task_run.policy_id` or
`guardrail_check.policy_rule_id`. `policy_id` lands with the "Build the policy-inheritance
mechanism" ticket (1a); `policy_rule_id` with Epic 5's rule-check. Migrations are additive, so a
nullable FK later is cheap.

## Alternatives considered
- **Two tables (drop `policy_seed_response`)** — rejected: loses re-generation and the audit
  record; you can't recover answers you never stored.
- **Combined rules (one per question, many-to-many citations)** — rejected: needs a join table and
  complicates "which citation"; atomic matches the ticket's singular "the `standard_rule` it derives
  from."
- **FK-only (no snapshot)** — rejected: citations could silently change if the catalog is
  re-seeded, breaking the point-in-time record.
- **Singleton policy / overwrite on re-gen** — rejected: destructive; no history for responsible-AI
  or the 1b fairness-evidence export.
- **Enums for `category`/`risk_tier` now** — rejected: fragile coupling to a free-text parent
  (`standard_rule`) and repeated enum migrations until Epic 4 settles its risk scheme; tighten both
  tables together then (ADR-0008's plan).
- **Service-role / privileged writes** — rejected: spreads the RLS-bypass key into app code (larger
  blast radius); the user's own org-scoped JWT is sufficient.
- **Enforce non-overridability at the DB now** — rejected: guards an edit path that doesn't exist in
  1a; YAGNI.
- **Add the FK hooks now** — rejected: dead, unwritten columns and speculative coupling; additive
  later is trivial.

## Consequences
- **Positive:** every rule is grounded and citable (provenance); the generator is **re-runnable**
  (answers persisted) and **non-destructive** (versioned-with-active); org isolation via RLS;
  least-privilege grants keep the service-role key out; consistent with ADR-0008 (free text + stable
  provenance) and ADR-0003 (all DB access in `lib/data`). Directly feeds the inheritance ticket and
  Epic 4/5.
- **Negative (the point):** `category`/`risk_tier` have **no DB-level validation yet** — mitigated
  because they're *inherited from the controlled catalog*, not LLM-free-written, and a code-level
  accessor will centralize them; convert to enums with Epic 4. **Non-overridability is not
  DB-enforced in 1a** — it holds only because there's no edit path; this is an **accepted,
  documented gap** to close in 1b with the editor. The snapshotted `citation` duplicates catalog
  text (the deliberate price of point-in-time provenance). Three tables is one more than the tickets
  named.
- **Neutral:** the `origin` enum is a small hand-maintained vocabulary; an **ERD diagram** is still
  a pending Week-4 deliverable (reference §17) and should be produced when the migration lands;
  builds on ADR-0003, ADR-0008, ADR-0007, and the ADR-9 tenancy pattern; supersedes nothing.
