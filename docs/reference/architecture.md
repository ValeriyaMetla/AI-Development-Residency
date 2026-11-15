# Technical architecture — Community AI Workflow Studio (Release 1a)

The three-tier plan for the app: the screens (tier 1), the server code (tier 2), and the database
(tier 3). This document consolidates the architecture; the costly-to-reverse choices behind it are
recorded as ADRs (see **References**), and the data model is drawn in
[`database-erd.md`](database-erd.md). It is kept current with the build, not a pre-code snapshot.

## Overview — three physical tiers, with a trust boundary

```
Browser (Next.js + Material UI)   ← Tier 1: pure view, no secrets, no governance logic
        │  HTTPS
        ▼
Vercel (Next.js server)  ◄── THE TRUST BOUNDARY ──►   Claude API (server-side only)
        │  holds the Claude key; enforces policy; labels provenance; writes audit     ← Tier 2
        ▼
Supabase (Postgres + Auth + Row-Level Security)   ← Tier 3: the record, isolated per org
```

Inside the Vercel tier, server code follows strict internal layers
(**[ADR-0003](../adr/0003-internal-server-layering.md)**): **Presentation → Service → Domain →
Data-Source**. The "Leak Test": no business or governance logic in the UI, and only the Data-Source
layer touches Supabase or the Claude SDK. An automated `scripts/arch-gate.mjs` enforces this in CI.

Stack choices: [ADR-0011](../adr/0011-use-nextjs-with-typescript.md) (Next.js + TypeScript),
[ADR-0005](../adr/0005-material-ui.md) (Material UI),
[ADR-0012](../adr/0012-host-on-vercel.md) (Vercel),
[ADR-0013](../adr/0013-use-supabase.md) (Supabase).

## Tier 1 — Presentation (screens)

React screens built with Material UI, in `studio/app/` (Next.js App Router). The root
`app/layout.tsx` wires the MUI theme (App-Router adapter). Screens are a pure view — they call
server actions and render results; they hold no secrets and enforce no policy.

| Route | Screen | What it does | Server entry (Tier 2) |
|---|---|---|---|
| `/` | Landing | Entry point into the app | — |
| `/signup` | Create account | Sign up; provisions an org + Accountable-Leader profile | `app/auth/actions.ts` |
| `/login` | Sign in | Authenticate (Supabase Auth) | `app/auth/actions.ts` |
| `/copilot` | Governance Co-Pilot | Evaluates a proposed AI use and returns a verdict, reasons, citations, and safer approach | `app/copilot/actions.ts` |
| `/dashboard` | Home (after login) | Entry to seed a policy and to run a governed Skill ("Draft a thank-you") | `app/skills/actions.ts` |

Accessibility (WCAG 2.2 AA) and usability are requirements on every screen, carried largely by MUI
plus review.

## Tier 2 — Application (server code on Vercel)

All privileged logic runs here, behind the trust boundary, in four layers (ADR-0003):

- **Presentation** — `studio/app/**` (the screens above).
- **Service** — the server actions / route handlers that the screens call:
  - `app/auth/actions.ts`, `app/policy-seed/actions.ts`, `app/skills/actions.ts`, and
  `app/copilot/actions.ts`. Thin: they authenticate, call the Domain layer, and return results.
- **Domain** — `studio/lib/domain/**`, pure rules with no I/O:
  - `pipeline.ts` — the **governed-run pipeline** used by governed Skills:
    context → draft → self-critique stage → rule-check → provenance → persist + audit.
  - `guardrails.ts` — the deterministic policy rule-check.
  - `policy-context.ts` — folds the org's active policy rules into the run (`withPolicyContext`).
  - `policy-generator.ts`, `policy-seed.ts`, `policy-seed-spec.ts` — turn intake answers into a
    starter policy.
  - `copilot.ts` — evaluates explicit signals and determines the Co-Pilot risk tier and verdict.
  - `copilot-grounding.ts` — attaches code-controlled reasons and standards citations.
  - `copilot-pipeline.ts` — runs the Co-Pilot's assess-then-narrate workflow.
- **Data-Source** — `studio/lib/data/**`, the only place that touches Supabase or the Claude SDK:
  - `claude.ts` (Claude API, Sonnet — the single call site), `policy.ts` (`getActivePolicy`,
  `getPolicyRules`), `profile.ts`, `runs.ts` (`task_run` / `task_output` / assessments / audit),
  and `standards.ts`.

Secrets (the Claude key and Supabase keys) live only in the local or Vercel server environment,
never in the browser (ADR-0011/0012). Data access uses the signed-in user's identity so RLS enforces tenancy (ADR-0013).

### How a governed run flows

1. **Context** — load the org's active policy + relevant standard rules.
2. **Draft** — call Claude (Data-Source) with the policy-grounded prompt.
3. **Self-critique** — the Challenger pass (stubbed in Phase 0; full in Phase 2).
4. **Rule-check** — deterministic guardrail (`guardrails.ts`).
5. **Provenance** — label the output as AI-assisted.
6. **Persist + audit** — save `task_run` + `task_output`; append a non-sensitive `audit_event`.

### How a Governance Co-Pilot assessment flows

The Co-Pilot uses a sibling assess-then-narrate pipeline rather than the governed Skill pipeline:

1. **Context** — authenticate the user and load the active policy and standards.
2. **Assess** — deterministic Domain code evaluates the explicit risk signals.
3. **Tier and verdict** — code assigns the risk tier and verdict before any model explanation.
4. **Grounding** — attach code-controlled reasons, standards citations, and a safer approach.
5. **Narration** — Claude may explain the structured result in plain language.
6. **Persist + audit** — save the `task_run` and `copilot_assessment`; append a non-sensitive
   `audit_event`.

The model does not choose the risk tier or verdict. If the explanatory model call fails, the
deterministic assessment can still return a structured result.

## Tier 3 — Data (Supabase)

Managed Postgres with Supabase Auth and **default-deny Row-Level Security** on every org-scoped
table, keyed on `current_org_id()` (ADR-0013 / [ADR-0007](../adr/0007-signup-provisioning-trigger.md)
/ [ADR-0009](../adr/0009-policy-seed-data-model.md)). Schema lives as version-controlled migrations
in `studio/supabase/migrations/`. The full diagram is in [`database-erd.md`](database-erd.md); the
tables, by group:

- **Tenancy & identity:** `org`, `profile` (extends Supabase `auth.users`).
- **Standards library** (global, read-only): `standard`, `standard_rule` (ADR-0008).
- **Policy** (org-owned, versioned): `policy`, `policy_rule`, `policy_seed_response` (ADR-0009).
- **Skills & runs:** `skill`, `task_run` (carries `policy_id`, the version applied), `task_output`, and `copilot_assessment`. The Co-Pilot assessment stores the verdict, risk tier, grounded recommendation, policy provenance, and human-decision requirement.
- **Guardrails:** `guardrail_check`.
- **Audit** (append-only, no sensitive content): `audit_event`.

Isolation is proven by RLS tenancy tests (org B cannot read org A). The audit log is append-only at
the DB-privilege level.

## References

- Layering + the Leak Test: [ADR-0003](../adr/0003-internal-server-layering.md)
- Stack: [ADR-0011](../adr/0011-use-nextjs-with-typescript.md) (Next.js+TS),
  [ADR-0005](../adr/0005-material-ui.md) (MUI), [ADR-0012](../adr/0012-host-on-vercel.md) (Vercel),
  [ADR-0013](../adr/0013-use-supabase.md) (Supabase)
- Data model: [`database-erd.md`](database-erd.md),
  [`../database-design.md`](../database-design.md),
  [ADR-0008](../adr/0008-standards-library-data-model.md),
  [ADR-0009](../adr/0009-policy-seed-data-model.md)
- Governance Co-Pilot: [ADR-0010](../adr/0010-copilot-risk-tiering.md),
  [`../design/epic-4-copilot-design.md`](../design/epic-4-copilot-design.md)
- Policy rule-check: [ADR-0014](../adr/0014-policy-rule-check.md)
- Decision log + lecture mapping: [`../BUILD-DECISIONS.md`](../BUILD-DECISIONS.md),
  [`week-4-technical-architecture.md`](week-4-technical-architecture.md)

