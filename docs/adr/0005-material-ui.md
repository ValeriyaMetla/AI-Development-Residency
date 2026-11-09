# ADR-0005: Use Material UI as the UI component library (supersedes Build-Plan ADR-33)

- **Status:** Accepted
- **Date:** 2026-11-08

## Context
Build-Plan ADR-33 chose a "minimal accessible design system: Tailwind + shadcn/ui (Radix)."
But the Week-4 challenge stack is **fixed** as Next.js + **Material UI** + Vercel + Supabase +
Claude API. The two specifications contradict each other on the UI component library, so one
must win before any UI is scaffolded.

Forces in tension:
- **The fixed residency stack names Material UI** — building on a different library risks the
  submission.
- **Solo builder under a deadline** — a batteries-included library means far fewer components
  to hand-build (YAGNI; "simplest that works").
- **Accessibility is a hard requirement** (WCAG 2.2 AA) — the library should carry a11y so it
  doesn't all fall on hand-written components.
- **AI-assisted build** — a mature, widely-documented library produces more reliable Claude
  code generation with fewer mistakes.

## Decision
Use **Material UI (MUI)** as the component library for Release 1a (and MVP #1), on Next.js
App Router, wired with the official **`@mui/material-nextjs`** App-Router adapter and an Emotion
cache so it works with React Server Components. All UI lives in the Presentation layer
(per ADR-0003). This **supersedes Build-Plan ADR-33** (Tailwind + shadcn/ui), whose status is
set to "Superseded by ADR-0005."

## Alternatives considered
- **Tailwind + shadcn/ui (Radix)** — ADR-33's original choice — rejected: more components to
  hand-build and maintain (slower for a solo MVP), and it conflicts with the fixed stack. The
  greater design control isn't worth the time and submission risk for Release 1a.
- **Headless primitives + fully custom CSS** — rejected: even more build effort; YAGNI.

## Consequences
- **Positive:** fewer components to build (speed); strong built-in accessibility toward
  WCAG 2.2 AA; reliable AI code generation; consistent theming out of the box; matches the
  fixed residency stack.
- **Negative (the point):** MUI's Material look is opinionated, so custom branding costs effort;
  heavier bundle plus an Emotion CSS-in-JS runtime; App Router needs the one-time
  `@mui/material-nextjs` adapter setup. The prototypes referenced in ADR-33 were built in a
  different system — treat them as *visual reference only* and re-implement in MUI.
- **Neutral:** supersedes ADR-33 only; the three-tier architecture (ADR-10) and internal
  layering (ADR-0003) are unchanged — MUI is confined to the Presentation layer.
