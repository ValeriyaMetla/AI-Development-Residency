# ADR-0017: Self-host the Roboto font via @fontsource instead of next/font/google

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

`studio/app/layout.tsx` loaded Roboto with **`next/font/google`**, which **fetches the font from
Google's servers at build time**. During Week 5 QA work we found this intermittently crashes
`next build` on CI:

```
app/layout.tsx
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
    at .../@next/font/dist/google/loader.js:122
```

The failure is **non-deterministic**: on `main`, CI run #111 (commit `1e7dde7`) failed at this exact
step while the previous nine runs (#100–#110) built the *identical* font code successfully. A real
code bug would fail every time; this fails only sometimes — the signature of a flaky **network/rate-limit
failure** when the shared CI runner IP fetches Google Fonts. Vercel deploys the same SHA because its
build happened to hit a good fetch.

This directly undermines the Week 5 outcome — *"automatic checks … on every push … so our safety
guarantees never quietly break."* A build that red-fails at random makes "red means stop, green
ships" meaningless and would block merges for reasons unrelated to code quality. (This also corrects
an earlier assumption in the Week 5 build plan that the red was a harmless offline artifact — it is a
real, recurring CI failure.)

## Decision

**Remove the build-time Google Fonts fetch; self-host Roboto via the `@fontsource/roboto` package.**

1. Add `@fontsource/roboto` as a production dependency (a zero-dependency package of font files +
   `@font-face` CSS).
2. In `app/layout.tsx`, drop `import { Roboto } from 'next/font/google'` and the `Roboto({…})` call;
   import the weight stylesheets we use instead: `@fontsource/roboto/{300,400,500,700}.css`.
3. In `app/theme.ts`, change the MUI typography `fontFamily` from `var(--font-roboto), …` to
   `Roboto, system-ui, Arial, sans-serif` (the `--font-roboto` CSS variable set by `next/font` is no
   longer produced, and `theme.ts` was its only consumer).

The font now ships in the application bundle; **no network fetch happens during `next build`**, on CI
or locally.

## Alternatives considered

- **`next/font/local` (self-host the `.woff2` files directly).** Equally reliable and keeps the
  `--font-roboto` variable (no `theme.ts` change), but requires committing binary font files into the
  repo and hand-managing each weight. `@fontsource` versions and packages the same files via npm and
  is MUI's own documented approach — chosen for maintainability.
- **Keep `next/font/google`, retry the build step on failure.** A band-aid: the flakiness remains,
  retries waste CI minutes, and "green" would depend on luck. Rejected.
- **Keep `next/font/google` and accept occasional red runs.** Unacceptable for a pipeline whose whole
  purpose (Week 5) is reliable green-on-every-push.
- **Drop Roboto for a pure system-font stack.** Removes the dependency entirely but changes the app's
  look; MUI's design language expects Roboto. Rejected.

## Consequences

- **Positive:** `next build` is now **deterministic and offline-capable** — verified locally with the
  full CI gate green (lint, format, types, 122 tests, build). Eliminates the #111-class failure.
  `@fontsource/roboto` has no transitive dependencies, so the production audit CI runs
  (`npm audit --omit=dev --audit-level=high`) reports **0 vulnerabilities**. Consistent with ADR-0005
  (MUI/Roboto) and ADR-0006 (CI quality gate); directly serves the Week 5 reliability outcome; builds
  are marginally faster (no network round-trip).
- **Negative (accepted):** we lose `next/font`'s automatic optimizations — font preloading and the
  `size-adjust` fallback metrics that reduce layout shift — so first paint may show a slightly larger
  flash-of-unstyled-text; `display: swap` behavior now comes from `@fontsource` defaults rather than
  `next/font`. For this app (an internal-feeling governance tool, not a public-marketing page) the
  trade is clearly worth a reliable build. One new dependency to keep updated.
- **Neutral:** the `--font-roboto` CSS variable is gone; `theme.ts` is its only former consumer and is
  updated in the same change. No database or API impact.
