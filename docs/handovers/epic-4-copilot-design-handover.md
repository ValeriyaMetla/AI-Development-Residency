# Handover — Epic 4 Governance Co-Pilot (DESIGN ONLY)

**For:** a parallel **non-code design chat** + Val, designing the Release 1a hero so its spec is
ready the moment Epic 1 (policy) lands.
**Date:** 2026-11-13

---

## ⚠️ How to start (read this first, AI agent)

**This is a DESIGN chat. Orient and wait — produce no code, and when Val directs you, produce a
design spec, not an implementation.** Your first move:
1. **Read** this doc and the shared context in **`docs/handovers/epic-1-handover.md`** (§1 project,
   §2 what's built, §3 source links, §4 codebase, §5 skill governance, §7 working norms — all
   shared; don't make me repeat them here).
2. Give Val a **short, plain-language orientation** of what the Co-Pilot is and the key design
   decisions.
3. **Stop and ask Val where she wants to start.** Draft nothing until she directs, one step at a time.

## 🚧 Guardrails (so this chat never interferes with the Epic 1 code chat)

There is **one shared Supabase database** and **one `main`**, and an Epic 1 chat is writing code +
migrations in parallel. To stay collision-free:
- **No code. No migrations. No database changes.** This chat only produces a **design document**.
- **The Epic 1 chat owns the database** right now — do not write or run any migration here.
- Write your output to **`docs/design/epic-4-copilot-design.md`** (create the `docs/design/`
  folder). **Do NOT add a numbered ADR under `docs/adr/`** — the Epic 1 chat is also creating ADRs
  and you'd collide on the next number. Instead include a **"Proposed ADR (to be numbered when
  Epic 4 is built)"** section inside your design doc.
- Touch only `docs/design/`. Leave `studio/` and `docs/adr/` to the code chats.
- Pure docs can go to `main` directly (project rule D12), but keep this chat's commits to
  `docs/design/` only.

## Why design this now (and not build it)

Epic 4 is the **Release 1a hero**, but it **depends on Epic 1**: the Co-Pilot reads the org's
**active policy** (Epic 1's output) and the **standards library** (already built) to ground its
advice. So we can't *build* it until Epic 1's `policy` tables exist — but we **can fully design it
now**, in parallel, so building is fast once Epic 1 merges. This shortens the critical path with
zero interference.

## What the Co-Pilot is (Epic 4, from the Notion "Epics and Features" page)

The Accountable Leader asks **"should we use AI for this, and how?"** and gets a grounded answer.

**Features (Release 1a):**
1. **"Should we use AI for this?" advisory flow [Must]** — describe a use → a clear
   **use / use-with-conditions / don't** recommendation with plain-language reasons. Risky use →
   advise against + explain. Out of scope → say so and point to a human rather than guess.
2. **"…and how" — safer-way recommendation [Must]** — when a use is risky, offer a concrete safer
   path (e.g., strip data first, add human review); when there's no safe version, a clear "don't".
3. **Expert defaults / always-on guidance [Should]** — sensible defaults with no configuration;
   an override persists.
4. **Grounded in the standards library [Should]** — each recommendation cites which baseline
   standard it draws on (NIST / EU AI Act / ISO 42001) and reflects the current version.

**Build Plan note:** "Epic 4: Governance Co-Pilot + **transparent risk-tiering** (needs engine +
standards) → logs to Epic 2." It runs through the existing **governed-run pipeline**
(`studio/lib/domain/pipeline.ts`; the `skill` enum already has a `copilot` type) and every
assessment is logged (Epic 2).

## The key design decisions to work through (the heart of this chat)

1. **Transparent risk-tiering as code, not a black-box verdict.** The spec must decide *how a use
   gets its risk tier by deterministic Domain-layer code* (inputs/signals → tier), with the LLM
   used to **explain** and to **draft the safer-way**, not to secretly decide. This is the product's
   trust claim — design it explicitly (what the code decides vs. what the model drafts).
2. **Grounding + provenance.** How the recommendation reads the org's active **policy** (Epic 1)
   and the **`standard_rule`** citations (standards library), and shows which standard backs each
   point.
3. **Pipeline fit.** How a Co-Pilot assessment flows through the shared governed-run pipeline
   (context → reason → checks → provenance → persist + audit), reusing what Epic 0 built.
4. **Data model it will need (design only — don't build).** Likely a **`copilot_assessment`**
   table (the schema already anticipates it: "approval / copilot_assessment / policy_suggestion
   tables arrive in Phase 1"), **org-owned** → org-scoped RLS like `task_run`. Specify the shape;
   the migration gets written later by whoever builds Epic 4, after Epic 1.
5. **Output shape.** The recommendation object: verdict (use / use-with-conditions / don't),
   plain-language reasons, standard citations, safer-way (when applicable), provenance label.
6. **Responsible-AI stance.** Out-of-scope → defer to a human; the Co-Pilot **advises, a human
   decides**; transparency of the risk logic; no fabricated citations. (Load the `responsible-ai`
   skill — this is a consequential advisory feature.)

## Scope discipline

- Design the **Release 1a** Co-Pilot (features 1–2 are Must; 3–4 are Should — design all, mark
  priority). Do not design Epic 5 guardrails, Epic 6 coaching, or the Justice Layer here.
- Everything is a **design proposal for Val to review**, grounded in the Notion specs — not a
  decision made alone.

## Your first move (AI agent)

Read the shared context (`docs/handovers/epic-1-handover.md`) and the Epic 4 section of the Notion
"Epics and Features" page, skim `studio/lib/domain/pipeline.ts` and `studio/lib/data/standards.ts`
to see what you'll build on, then give Val a plain-language orientation of the Co-Pilot and the six
design decisions above, and **ask her which to start with**. Design nothing until she says go.
