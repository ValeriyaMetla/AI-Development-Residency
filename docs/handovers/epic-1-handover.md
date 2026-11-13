# Handover — Epic 1 (Set Your Rules / Policy Seed)

**For:** the next chat (AI agent) + Val, picking up **Epic 1** of Community AI Workflow Studio.
**Date:** 2026-11-13

---

## ⚠️ How to start (read this first, AI agent)

**Orient and wait — do not produce.** Your first job is to:
1. **Review** this handover and the linked materials (reference doc, Notion specs, the codebase).
2. Give Val a **short, plain-language orientation** of what Epic 1 requires.
3. **Stop and ask Val what the first step is** — build, draft, or propose *nothing* until she
   directs each step, one move at a time.

Val works step by step and wants to stay in the loop and learn. When in doubt, **ask rather than
produce**. Full final versions of any deliverable (not diffs). Show your reasoning. Close every
working turn with a 🧾 skill-usage receipt.

---

## 1. What this project is (in one paragraph)

**Community AI Workflow Studio** helps small nonprofits use AI safely and fairly: set your own
rules once, run everyday tasks with a safety net, and grow your AI policy just by using it. The
audience for Release 1a is the **Accountable Leader** (a non-technical ED/Ops director responsible
for safe AI use, with no policy, no tech team, no time). The hero of Release 1a is the
**Governance Co-Pilot** ("should we use AI for this?"). Epic 1 is the step *before* the Co-Pilot:
it creates the org's **starter policy** that everything else is checked against.

## 2. Where we are now (what's already done)

**Epic 0 is COMPLETE** — the full foundation is built, merged to `main`, and **live on Vercel**:
- Next.js 15 + TypeScript + Material UI scaffold; CI quality gate + architecture gate on every PR.
- Supabase database: core schema, **default-deny Row-Level Security** (per-org isolation, proven),
  append-only audit log, sign-up trigger that provisions an org + Accountable-Leader profile.
- The **governed-run pipeline** (one path every AI task flows through: context → draft →
  self-critique(stubbed) → rule-check → provenance → persist + audit).
- A walking-skeleton Skill ("Draft a thank-you note") proving the pipeline end to end.
- **The standards library** (Epic 0's last content piece): tables `standard` + `standard_rule`,
  seeded with 3 frameworks (NIST AI RMF, EU AI Act, ISO/IEC 42001) and **9 cited baseline rules**,
  queryable by category. **Epic 1 builds directly on this.**
- Live public URL (Vercel), verified: signup, login, and a governed AI draft all work in production.

> Note: the "Draft a thank-you" Skill was only the walking-skeleton test dummy; in the product
> plan it actually belongs to **Release 1b**. Don't polish it as part of Epic 1.

## 3. Your materials (sources of truth)

**Local reference doc (attached in chat — Val to confirm it's the right one):**
- `docs/reference/week-4-technical-architecture.md` — the captured Week-4 lecture + assignment:
  the layer model & "Leak Test," data-source patterns, ADR practice, hosting, launch checklist.

**Notion — product specifications & board** (the authoritative *what & why*):
- Product Specs hub: https://app.notion.com/p/3f9975c3b950805888fde43ddd2120c7
- Kanban board ("Tasks Go Here"): https://app.notion.com/p/3f9975c3b95080a88e79c1b79dbff0b6
- Product Release Vision & Scope: https://app.notion.com/p/403975c3b950808181c1ceb0c6ec461f
- Build Plan (build sequence + 34 ADRs): https://app.notion.com/p/406975c3b95080c89afae6843325616c
- Technical Requirements (APIs, data flow): https://app.notion.com/p/406975c3b95080b2bffadda2ada6d007
- Non-Functional Requirements: https://app.notion.com/p/406975c3b950801e82c8d6e6bc5440dd

**Repo:** `ValeriyaMetla/AI-Development-Residency` (app lives in the `studio/` subfolder).

## 4. The codebase (our development work)

- **Layering (ADR-0003, enforced):** Presentation (`studio/app` UI) → Service (route handlers /
  server actions) → Domain (`studio/lib/domain`, pure rules) → Data-Source (`studio/lib/data`, the
  only place that touches Supabase or the Claude SDK). The "Leak Test": no business/governance
  logic in the UI. An automated `scripts/arch-gate.mjs` enforces this in CI.
- **Key files to study before Epic 1:**
  - `studio/lib/data/standards.ts` — how the standards library is read (`getStandardRulesByCategory`).
  - `studio/supabase/migrations/` — all DB migrations; `..._standards_library_tables.sql` and
    `..._seed_standards.sql` are the pattern to copy for `policy` / `policy_rule`.
  - `studio/lib/domain/pipeline.ts` — the governed-run pipeline Epic 4 will reuse.
  - `studio/lib/data/claude.ts` — the only place the Claude SDK is called (model: Sonnet, ADR-3).
  - `docs/adr/` — read every ADR before changing anything; write a new ADR for big decisions.
- **Run locally:** `cd studio && npm run dev` → http://localhost:3000. Verify suite:
  `npm run format:check && npm run lint && npm run typecheck && npm run test:run && npm run build`,
  plus `node scripts/arch-gate.mjs --changed --base main` from the repo root.
- **Migrations:** write the `.sql` file in `studio/supabase/migrations/`, then Val runs it in the
  Supabase SQL Editor. ⚠️ When a migration contains its own `enable row level security`, pick
  **"Run without RLS"** in the Supabase dialog (the "Run and enable RLS" button mis-parses
  multi-statement scripts). Keep seed text plain ASCII.

## 5. Skill governance — quick reference

This project runs a **routing check before producing anything** (see root `CLAUDE.md`):
1. Place the task in the taxonomy (`docs/SKILLS-LIBRARY.md`), scan the matched categories + the
   always-on cross-cutting standards.
2. State the routing in one line before any code/spec/design.
3. Load and follow every matching skill.
4. Close with a 🧾 **skill receipt** (which skills, why, how).

**Skills most relevant to Epic 1:**
- `product-specs` / `technical-planning` — turning the Epic 1 tickets into a build plan + ADRs.
- `responsible-ai` — Epic 1 generates an AI policy *and* uses AI to draft it; grounding,
  disclosure, human-in-the-loop, no fabrication all apply.
- `secure-coding` — new tables need RLS (policy data is **org-owned**, unlike the global standards
  catalog); untrusted intake input must be validated.
- `judge-arch` — new data model + layering review before done/PR.
- `ai-evaluation` — if the generator uses the LLM, check its output quality.
- `ux-usability` + `accessibility` — the intake flow is a user-facing form.

## 6. Epic 1 — outline in plain language

**Goal:** let the Accountable Leader answer a few plain questions and get a **usable starter AI
policy** in minutes — grounded in the standards library, auto-applied to everything after. This is
the product's **core bet**, so it's built early in Release 1a.

**The pieces (from the Notion tickets):**

1. **Design the seed question set** (`Policy-seed intake`, Must)
   - *Plain:* decide the short list of questions (target ≤ ~8–10, answerable in ≤5 min) a
     non-expert can answer with no AI/legal knowledge.
   - *Rules it must satisfy:* every question maps to at least one starter rule it will seed (no
     orphan questions); each optional question has a documented **safe default**.

2. **Generate a starter policy from answers** (`Policy-seed intake`, Must — *the core bet*)
   - *Plain:* turn the answers into a real, plain-language set of policy rules.
   - *Rules it must satisfy:* produces a plain-language draft rule set; a skipped optional answer
     applies a **safe-default** rule (flagged for review); **higher-risk areas get baseline-safety
     rules marked non-overridable** (`is_baseline_safety`); **every generated rule cites the
     `standard_rule` it derives from** (provenance) — this is where the standards library plugs in.

3. **Build the step-by-step intake flow** (the UI that asks the questions and calls the generator).

4. **Policy auto-applied to every governed assessment** (inheritance) — so the Co-Pilot (Epic 4)
   automatically checks against the active policy.

**New data model Epic 1 will need** (confirm against Build Plan / Tech Reqs before building):
`policy`, `policy_rule`, and `policy_seed_response` (stores the intake answers). These are
**org-owned** tables → they need org-scoped RLS (like `task_run`), *not* the global read-only
pattern the standards catalog used.

**How it connects to what exists:** the generator reads `standard_rule` (standards library, done)
and writes `policy_rule` (new), each citing its source standard. Later, the Co-Pilot (Epic 4) and
the rule-check (Epic 5) read the active `policy` to judge a use.

**Deferred to Release 1b (NOT Epic 1):** editable rule set, living-policy suggestions, policy
export/portability.

## 7. Working norms (how Val collaborates)

- One step at a time; get input/approval before moving on; don't one-shot a deliverable.
- Full final versions of deliverable content, never just diffs.
- Show the digging (reasoning, trade-offs), not pre-baked conclusions.
- Sourcing integrity: quotes only around verbatim source text; cite real sources; flag inferences.
- App code lands via branch + PR (CI + arch-gate run); pure docs can go straight to `main`.
- Read `docs/BUILD-RULEBOOK.md` (Definition of Done + git workflow) before calling work done.
- 🧾 skill receipts every working turn.

## 8. Your first move (AI agent)

Read §6 and the two Epic 1 tickets on the Kanban board, skim `studio/lib/data/standards.ts` and a
migration, then give Val a plain-language orientation of Epic 1 and **ask her what to start with**
(likely: the seed question set, or the `policy`/`policy_rule` data model + ADR). Build nothing
until she says go.
