# Release 1a — what we built and what we decided

**Community AI Workflow Studio** — a tool that helps small nonprofits use AI safely and fairly:
set your own AI-use rules once, run everyday tasks with a safety net, and keep a trustworthy record.
Release 1a is the **Accountable-Leader journey** and Week 4 submission release. It is built, merged
to `main`, and live on Vercel. The broader product MVP continues in Release 1b.

**Live app:** [https://ai-development-residency-nine.vercel.app/](https://ai-development-residency-nine.vercel.app/)

## What you can do in the live app

1. **Sign up / log in.** Signing up provisions an organization and an Accountable-Leader profile.
2. **Seed your AI policy in ~5 minutes.** A guided intake turns a few plain-language answers into a
   starter policy, with each rule grounded in a recognized standard (NIST AI RMF / EU AI Act / ISO
   42001) and non-overridable baseline-safety rules flagged.
3. **Your policy governs every run.** The active policy is read fresh on each governed task and
   folded into the model's context, so staff follow the rules without wiring anything up.
4. **Run a governed Skill — "Draft a thank-you."** The task flows through one fixed pipeline:
   context → draft → self-critique stage → rule-check → provenance → persist + audit. Output is
   labeled AI-assisted and logged. The self-critique stage is currently a placeholder; the full
   Challenger pass and productionized Skill experience are planned for Release 1b.
5. **Ask the Governance Co-Pilot "should we use AI for this?"** It returns a clear verdict
   (use / use-with-conditions / don't / out-of-scope) with plain reasons, a safer-way suggestion,
   and a standard citation — the risk tier decided by transparent deterministic code, not a
   black-box model call.
6. **Everything is isolated and recorded.** Row-Level Security keeps each org's data private, and an
   append-only audit log records activity with no sensitive content.

## What changed and shipped (by epic)

Release 1a moved the project from an initial application scaffold to a deployed, governance-first
product slice.

- **Epic 0 — Foundation:** Next.js + TypeScript + Material UI scaffold; Supabase + Auth + default-deny
  RLS; the governed-run pipeline; the standards library (3 frameworks, 9 cited rules); append-only
  audit; CI + architecture gate.
- **Epic 1 — Policy seed & inheritance:** the ~5-minute intake, the policy generator, the
  plain-language rule set, and policy inheritance into every governed run.
- **Epic 2 — Registry (store):** automatic logging of every governed task; no sensitive content in
  the log.
- **Epic 4 — Governance Co-Pilot (the hero):** transparent risk-tiering engine, grounding in policy +
  standards, the `/copilot` advisory flow, and the `copilot_assessment` record.
- **Epic 5 — Guardrails (rule-check + provenance):** the deterministic policy rule-check engine and
  provenance labels on every output.

## Architecture (three tiers)

Browser (pure view) → Vercel server (the trust boundary: policy, Claude call, provenance, audit) →
Supabase (Postgres + Auth + RLS). Inside the server, strict layers: Presentation → Service → Domain
→ Data-Source (the "Leak Test"). Full detail in
[`docs/reference/architecture.md`](reference/architecture.md); the data model is in
[`docs/reference/database-erd.md`](reference/database-erd.md) and
[`docs/database-design.md`](database-design.md).

## Key decisions (ADRs)

The costly-to-reverse choices are recorded in [`docs/adr/`](adr/):

- **Stack:** Next.js + TypeScript (0011), Material UI (0005), Vercel (0012), Supabase (0013).
- **Architecture:** internal layering / Leak Test (0003), repo layout (0004), CI quality gate (0006).
- **Data & tenancy:** sign-up provisioning trigger (0007), org-scoped RLS, standards-library model
  (0008), policy-seed model (0009).
- **Governance:** the Co-Pilot's transparent risk-tiering (0010) and the policy rule-check (0014).

The guiding principles throughout: governance logic is **deterministic code outside the model** (so a
compromised prompt can't disable it), every recommendation is **grounded and cited** (no fabricated
citations), and a **human always decides** — the tool advises.

## Deferred (not in Release 1a)

Honest scope line:

- **Release 1b (next):** usage dashboard, living-policy suggestions, editable rules, policy export;
  a productionized governed Skill runner and full Challenger self-critique; fuller guardrails
  (PII detect/strip, the human-approval UI, risky-use flagging); in-the-moment coaching;
  funder-ready reporting; self-serve onboarding + the free tier.
- **MMP (later):** Workflows (chaining Skills) and the Justice Layer.

## Status

Live on Vercel; CI and the architecture gate are green on `main`. All 25 Release 1a Week 4
submission-scope tickets are in Done. Live RLS and two-account organization isolation were
verified.

The remaining Week 4 submission work is the phone/mobile-width check and Valeriya's personally
completed Submission Template.
