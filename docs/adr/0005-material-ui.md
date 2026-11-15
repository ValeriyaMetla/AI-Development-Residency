# ADR-0005: Use Material UI as the UI component library (supersedes Build-Plan ADR-33)

## Date and status
November 8, 2026. Accepted. (Supersedes Build-Plan ADR-33 — Tailwind + shadcn/ui.)

## Context
Build-Plan ADR-33 chose a "minimal accessible design system: Tailwind + shadcn/ui (Radix)." But the
Week-4 challenge stack is **fixed** as Next.js + **Material UI** + Vercel + Supabase + Claude API.
The two specifications contradict each other on the UI component library, so one must win before any
UI is scaffolded. The forces that matter: the fixed residency stack names Material UI (building on a
different library risks the submission); a solo builder under a deadline wants fewer components to
hand-build; accessibility is a hard requirement (WCAG 2.2 AA); and an AI-assisted build produces
more reliable Claude code generation against a mature, widely-documented library.

## Options
- Material UI (MUI):
  - Good: batteries-included, so far fewer components to hand-build (speed for a solo MVP); strong
    built-in accessibility toward WCAG 2.2 AA; reliable AI code generation; consistent theming out of
    the box; matches the fixed residency stack.
  - Bad: the Material look is opinionated, so custom branding costs effort; heavier bundle plus an
    Emotion CSS-in-JS runtime; the App Router needs the one-time `@mui/material-nextjs` adapter setup.
- Tailwind + shadcn/ui (Radix) — ADR-33's original choice:
  - Good: greater design control; lighter-weight primitives.
  - Bad: more components to hand-build and maintain (slower for a solo MVP); conflicts with the fixed
    stack, risking the submission.
- Headless primitives + fully custom CSS:
  - Good: maximum control over look and behavior.
  - Bad: the most build effort of all; unnecessary for Release 1a (YAGNI).

## Decision
Use **Material UI (MUI)** as the component library for Release 1a (and MVP #1), on the Next.js App
Router, wired with the official **`@mui/material-nextjs`** App-Router adapter and an Emotion cache so
it works with React Server Components. All UI lives in the Presentation layer (per ADR-0003). This
**supersedes Build-Plan ADR-33** (Tailwind + shadcn/ui), whose status is set to "Superseded by
ADR-0005." We chose MUI because it covers the most ground for the least build effort while carrying
accessibility, and it matches the fixed stack.

## Consequences
Easier: fewer components to build (speed); strong built-in accessibility toward WCAG 2.2 AA; reliable
AI code generation; consistent theming out of the box. Harder: MUI's Material look is opinionated, so
custom branding takes effort; a heavier bundle plus an Emotion CSS-in-JS runtime; the App Router needs
the one-time `@mui/material-nextjs` adapter setup (its theme/provider file needs a `"use client"`
line). The prototypes referenced in ADR-33 were built in a different system — treat them as *visual
reference only* and re-implement in MUI. The three-tier architecture and internal layering (ADR-0003)
are unchanged — MUI is confined to the Presentation layer. Next: scaffold the MUI theme provider and
the shared layout.
