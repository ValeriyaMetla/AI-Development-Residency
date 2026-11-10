# Community AI Workflow Studio

The application for **Community AI Workflow Studio** — a tool that helps small nonprofits use AI
safely and fairly: start from your organization's own AI-use rules, run governed tasks, and keep a
trustworthy record. This is the **Release 1a** build.

App code lives here in `studio/` as part of the [`AI-Development-Residency`](../) repo
(per [ADR-0004](../docs/adr/0004-repository-layout.md)). Before technical work, read
[`docs/reference/week-4-technical-architecture.md`](../docs/reference/week-4-technical-architecture.md)
and the [ADRs](../docs/adr/).

## Stack

- **Next.js** (App Router) + **TypeScript** (strict)
- **Material UI** via the `@mui/material-nextjs` adapter ([ADR-0005](../docs/adr/0005-material-ui.md))
- **Vercel** (hosting) · **Supabase** (database / auth) — wired in later Phase 0 steps
- **Claude API** (server-side only) — later

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

Other scripts: `npm run build` (production build) · `npx tsc --noEmit` (type-check) ·
`npm run lint`.

## Environment & secrets

Secrets live in `studio/.env.local` (gitignored) and in Vercel's environment settings — **never**
committed, and server-only secrets (the Claude API key, the Supabase service-role key) are **never**
exposed with a `NEXT_PUBLIC_` prefix. These are added in the auth and pipeline steps.

## Status

**Phase 0 — Foundation + walking skeleton.** Step 1 (scaffold) done; CI gate, data model + RLS,
auth, append-only audit, and the governed-run pipeline shell follow. See the Build Plan (Notion).

Maintainer: Val (@ValeriyaMetla).
