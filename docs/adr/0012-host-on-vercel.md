# ADR-0012: Host and deploy on Vercel

## Date and status
November 14, 2026. Accepted.

## Context
Release 1a has to be live at a public web address and redeploy on every merge, without a solo
builder running servers. Server-side secrets (the Claude API key, Supabase keys) must never reach
the browser, and the MVP must run on a free tier. The app is Next.js (ADR-0011).

## Options
- Vercel (with Git integration):
  - Good: push-to-deploy; a preview URL per pull request; first-party Next.js support (least
    config); server-only environment variables; free tier covers the MVP.
  - Bad: some vendor lock-in (build settings, env vars, function model); serverless limits
    (execution time, cold starts) shape the architecture.
- A VM or container host (AWS EC2, Fly.io, Render):
  - Good: full control over the runtime.
  - Bad: server setup and ops a solo MVP doesn't need; slower to a public URL.
- Netlify / Cloudflare Pages:
  - Good: similar managed continuous deployment.
  - Bad: less first-party Next.js/App-Router support than Vercel.

## Decision
Host on **Vercel** with Git-based continuous deployment: each PR gets a preview URL and each merge
to `main` publishes production at `your-app.vercel.app`. Secrets live in Vercel's server-side
environment variables, never in client code. The CI gate (lint, types, tests, build, dependency +
secret scan — ADR-0006) must pass before Vercel publishes.

## Consequences
Easier: no server ops; push-to-deploy with per-PR previews; server-only secrets; free for the MVP;
the pipeline mirrors the product's auditable-trail ethos. Harder: managed-platform lock-in, and
serverless limits that keep the MVP synchronous (revisit for background jobs when Workflows arrive
in the MMP). Next: co-locate Vercel functions with the Supabase region to cut latency.
