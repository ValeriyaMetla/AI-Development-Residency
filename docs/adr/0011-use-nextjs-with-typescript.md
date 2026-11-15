# ADR-0011: Use Next.js (App Router) with TypeScript

## Date and status
November 14, 2026. Accepted.

## Context
This is a governance tool whose trust boundary is the server: policy enforcement, the Claude API
call, PII handling, and the audit log must run where a compromised browser cannot reach them. We
need one framework that serves the screens AND runs that privileged server code, deployable by a
solo builder on a weekly deadline. (The UI component library, Material UI, is decided separately in
ADR-0005.)

## Options
- Next.js (App Router) + TypeScript:
  - Good: screens and server code in one project, one language, one deploy; privileged logic stays
    server-side; first-party Vercel support; strong AI code-generation support; types catch errors
    early (safer to accept AI-written code).
  - Bad: App Router / React Server Components have a learning curve; you must watch which code runs
    on the server vs. the browser or logic can leak to the client.
- Separate SPA (React/Vite) + a standalone API (Node/Express or Python/FastAPI):
  - Good: clear front-end/back-end split; Python is strong for agent orchestration later.
  - Bad: two codebases and two deploys with glue between them — too much for a solo MVP.
- Another full-stack framework (Remix, SvelteKit):
  - Good: also capable full-stack frameworks.
  - Bad: off the fixed residency stack; thinner AI-generation and ecosystem support.

## Decision
Use **Next.js (App Router) with TypeScript**. All privileged logic lives server-side in the
Service → Domain → Data-Source layers (ADR-0003); the browser is a pure view. Material UI is the
component library (ADR-0005), wired with the official `@mui/material-nextjs` adapter. TypeScript is
used end to end, with the official Anthropic and Supabase TypeScript SDKs.

## Consequences
Easier: one language and one deploy; secrets and governance logic stay behind the server trust
boundary; typing catches mistakes; excellent Vercel integration (ADR-0012). Harder: the App
Router / RSC learning curve, and server/client boundary mistakes are possible — mitigated by the
ADR-0003 layering and the CI arch-gate (ADR-0006). Next: decide hosting (ADR-0012) and the
database (ADR-0013).
