# Community AI Workflow Studio

The application for **Community AI Workflow Studio** — a tool that helps small nonprofits use AI
safely and fairly: start from your organization's own AI-use rules, run governed tasks, and keep a
trustworthy record. This is the **Release 1a** build.

**Live app:** [https://ai-development-residency-nine.vercel.app/](https://ai-development-residency-nine.vercel.app/)

App code lives here in `studio/` as part of the [`AI-Development-Residency`](../) repo
(per [ADR-0004](../docs/adr/0004-repository-layout.md)). Before technical work, read
[`docs/reference/week-4-technical-architecture.md`](../docs/reference/week-4-technical-architecture.md)
and the [ADRs](../docs/adr/).

## Stack

- **Next.js** (App Router) + **TypeScript** (strict)
- **Material UI** via the `@mui/material-nextjs` adapter ([ADR-0005](../docs/adr/0005-material-ui.md))
- **Vercel** (hosting, [ADR-0012](../docs/adr/0012-host-on-vercel.md)) · **Supabase** (database / auth / RLS, [ADR-0013](../docs/adr/0013-use-supabase.md))
- **Claude API** (Sonnet, server-side only) — the single call site is `lib/data/claude.ts`

## Internal layers ([ADR-0003](../docs/adr/0003-internal-server-layering.md))

Dependencies flow one way: Presentation → Service → Domain → Data Source. Nothing lower depends on
Presentation (the **Leak Test**).

- `app/` — **Presentation** (UI) + **Service** (route handlers / server actions). No business
  rules; never touches the database directly.
- `lib/domain/` — **Domain**: governance and business rules as pure functions (the crown jewel).
- `lib/data/` — **Data Source**: all Supabase access, isolated here.
- `app/theme.ts` — Material UI design tokens. Colors, spacing, and typography come from the theme,
  never hardcoded in components.

## Getting started

```bash
cd studio
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build` (production build) · `npm run typecheck` · `npm run lint` ·
`npm run test:run` · `npm run format:check`.

## Environment & secrets

Secrets live in `studio/.env.local` (gitignored) and in Vercel's environment settings — **never**
committed, and server-only secrets (the Claude API key, the Supabase service-role key) are **never**
exposed with a `NEXT_PUBLIC_` prefix. They are set in `.env.local` locally and in Vercel's
environment settings for production.

## Status

**Release 1a — complete and live on Vercel.** This is the Week 4 submission release and first
shippable Accountable-Leader slice. It includes sign-up / login, the ~5-minute policy seed, policy
inheritance into every governed run, the Release 1a "Draft a thank-you" governed Skill slice, the
Governance Co-Pilot (`/copilot`), the deterministic policy rule-check, provenance labels,
append-only audit, and org-scoped RLS. CI and the architecture gate are green on `main`.

The broader product MVP continues in Release 1b with the productionized governed Skill experience,
full self-critique, PII handling, human approval, dashboards, and the Frontline-Doer journey.

See [`docs/RELEASE-1A.md`](../docs/RELEASE-1A.md) for what shipped and what was decided.

Maintainer: Val (@ValeriyaMetla).
