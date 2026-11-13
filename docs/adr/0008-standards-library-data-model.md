# ADR-0008: Standards library data model — `standard` + `standard_rule` as a read-only catalog

- **Status:** Accepted
- **Date:** 2026-11-13

## Context
Epic 0's standards library must store 6–10 baseline AI-safety rules as structured, categorized,
citable rows that are **queryable by category** — grounding the Epic 1 policy seed and the Epic 4
Co-Pilot's advice. The [core schema](../../studio/supabase/migrations/20261110000000_phase0_core_schema.sql)
deliberately deferred the "richer policy & standards tables … to Phase 1," so this is the first
of them. The rules trace to three real frameworks (NIST AI RMF, EU AI Act, ISO/IEC 42001), each
of which can be versioned independently.

Forces in tension:
- **Queryable + citable** — the Co-Pilot must fetch rules by category and cite a specific rule.
- **Simplicity (YAGNI)** — ≤10 rows don't justify a vector DB or embeddings (Build-Plan ADR-4).
- **Stable references** — provenance (Build-Plan ADR-7) needs a durable handle to each rule.
- **Not yet fully specified** — the Co-Pilot's risk scheme (Epic 4) and the seed's category set
  (Epic 1) aren't designed yet, so over-constraining them now would cause churn.

## Decision
**Two tables**, seeded by a privileged migration and exposed as a **global read-only catalog**
(the same pattern as `skill`):

- **`standard`** — the source framework: `name` (enum: `nist_ai_rmf` | `eu_ai_act` | `iso_42001`),
  `version`, `tier` (enum: `baseline` | `justice`; only `baseline` is used in Release 1a).
  `unique (name, version)` allows future versions.
- **`standard_rule`** — one plain-language rule: `code` (stable unique key for provenance),
  `rule_text`, `category`, `risk_tier`, `citation`, and a FK to `standard`. Indexed on
  `standard_id` and `category`.

**`category` and `risk_tier` are free `text`, not enums** — the seed's category set (Epic 1) and
the Co-Pilot's risk scheme (Epic 4) aren't settled; we tighten to enums when they are.

**Access:** RLS enabled on both tables with a SELECT-only policy for `authenticated` (writes are
blocked by the absence of any write policy, exactly as with `skill`); the library is seeded by a
privileged migration that runs as the owner. **No vector DB** (Build-Plan ADR-4) — structured
rows with a category index are enough for ≤10 rules.

## Alternatives considered
- **One flat table** (rules only, framework as a text column) — rejected: can't version a
  framework cleanly and duplicates framework metadata on every row.
- **Enums for `category` / `risk_tier` now** — rejected: premature; the schemes aren't designed
  (Epics 1/4), so we'd be migrating enums repeatedly. Free text now, enum later.
- **Vector DB / embeddings** — rejected per Build-Plan ADR-4: overkill for ≤10 rules; exact
  category queries beat semantic search here and keep the stack simple.
- **JSON blob of rules in one column** — rejected: not queryable by category, no per-rule
  integrity or stable reference.

## Consequences
- **Positive:** simple and queryable by category; each rule is citable and has a stable `code`
  for provenance; frameworks are versionable; read-only by construction. Directly feeds Epic 1
  and Epic 4.
- **Negative (the point):** `category` and `risk_tier` have no DB-level validation yet — a typo
  in a category wouldn't be caught by the database. Mitigated because the **seed migration is the
  only writer** (RLS blocks app writes) and a code-level accessor will centralize category names;
  we accept a later migration to convert them to enums once Epics 1/4 fix the vocabularies.
- **Neutral:** the `justice` tier is reserved but unused until the MMP Justice Layer; the `code`
  keys are a naming convention we maintain by hand. Builds on ADR-0003 (data-source layer) and
  the `skill` catalog + RLS pattern from Step 5.
