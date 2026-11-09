# ADR-0003: Internal server code follows Service → Domain → Data-Source layers

- **Status:** Accepted
- **Date:** 2026-11-08

## Context
The *physical* architecture is already set: three tiers — browser (view only), Next.js
server (trust boundary), Supabase — with Claude called only from the server (Build Plan
ADR-10), and one shared governed-run pipeline every Skill and the Co-Pilot pass through
(Build Plan ADR-11). What is **not** yet specified is how the code *inside* the Next.js server
is organized. Left unsaid, business and governance rules tend to scatter into route handlers
and React components.

Forces in tension:
- **Maintainability.** A solo, AI-assisted build needs a layout where a newcomer — or a future
  Claude session — finds the governance rules by convention, not by searching. (One of the
  four enterprise promises from the Week-4 architecture lecture.)
- **Governance integrity.** This is a tool that governs AI use; a guardrail that lives in a
  React component is one a bug or attacker can skip. Rules must sit server-side, provably.
- **YAGNI.** A solo MVP must not pay for a heavy object model or multi-service ceremony it
  doesn't need yet.

## Decision
Organize all server code into three internal layers (Martin Fowler), as a **folder
convention**, with dependencies flowing one direction only — **Presentation → Service →
Domain → Data Source** — and nothing lower ever importing from something higher:

- **Presentation** — React components / pages (`app/` UI). A pure view: no business rules, no
  data access. (Reaffirms Build Plan ADR-10.)
- **Service** — Next.js route handlers and server actions (`app/.../route.ts`, server actions).
  The "front door": verifies session + role, sets transaction boundaries, orchestrates a
  use-case by calling the Domain layer. Kept thin.
- **Domain** — `lib/domain/`. The crown jewel: the governed-run pipeline, guardrail checks,
  risk-tiering, and policy logic as pure, deterministic functions (pairs with Build Plan
  ADR-27). No HTTP objects, no direct Supabase SDK calls.
- **Data Source** — `lib/data/`. All Supabase access (queries, reads/writes) isolated here, so
  raw data access never leaks into Domain or Presentation.

**The Golden Rule:** the Domain and Data-Source layers must never depend on Presentation.
**The Leak Test** (tracked separately as decision D4) is the check that enforces it: if you
could not swap the browser for a command-line script without copying logic, that logic is in
the wrong layer.

## Alternatives considered
- **No internal layering — feature folders only** — rejected: business and governance rules
  scatter into routes and components; the guardrails-server-side guarantee erodes; fails the
  Leak Test.
- **Full Domain Model / DDD (rich objects, repositories, bounded contexts)** — rejected: YAGNI
  for a solo MVP. The guardrail logic is straightforward enough for Transaction Script–style
  functions (decision D5); DDD's ceremony isn't earned yet.
- **Hexagonal (ports & adapters)** — rejected: more indirection than a single-deploy monolith
  (Build Plan ADR-1) needs now; the three-layer split already isolates the external edges
  (Claude, Supabase) sufficiently.

## Consequences
- **Positive:** a newcomer or future session finds governance rules by convention;
  guardrails are provably server-side and unit-testable (reinforces Build Plan ADR-16 and
  ADR-27); the Leak Test becomes a concrete, checkable review rule; isolating data access in
  `lib/data/` makes a future datastore change far less painful.
- **Negative (the point):** more files and one more hop than inlining logic in a route handler;
  it takes discipline — under time pressure it's tempting to drop a query into a route or a
  rule into a component, and the convention is instruction-strength, not compiler-enforced
  (a lint boundary rule could be added later if it slips).
- **Neutral:** the folder names (`lib/domain/`, `lib/data/`) are a convention and can be
  renamed; this decision sets *where logic lives*, not *how the domain objects are shaped*
  (that is decision D5 — Transaction Script). Complements Build Plan ADR-10/11/16/27;
  supersedes nothing.
