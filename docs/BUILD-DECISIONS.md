# Build Decisions Log — Release 1a

A **running list of decisions we still need to make** to build MVP #1 Release 1a of
*Community AI Workflow Studio*. Each entry is written in plain language: **the question**,
**why it matters**, and a **proposed solution** (a recommendation, not a final answer).

> **How this differs from the ADRs in `docs/adr/`:** an ADR records a decision *already
> made*. This log holds decisions *still open*. When we settle an item here, it either
> "graduates" into a new ADR (if it's costly to reverse) or folds into the Build Plan, and
> its status here flips to **Decided**. Nothing is erased — decided items stay for the record.

**Status legend:** 🔵 Open · 🟡 Leaning (proposal on the table, not confirmed) · ✅ Decided

*Owner: Val · Living draft — add to it as new lecture material and build questions arrive.*

---

## A. Process & where things live

### D1 — Where the app code and these build docs live 🔵
**The question:** Do we build the app in a `studio/` subfolder of the `AI-Development-Residency`
repo (the proposed name), and do the build docs (this log, the build rulebook) live in the
repo's `docs/` or in Notion with the Week 2 specs?

**Why it matters:** This is the container every other decision drops into. The app needs a
home before any code is written, and we want one obvious place to look for "how we build."

**Proposed solution:** Confirm **`studio/`** as the app subfolder (one repo, matches your
monolith choice in ADR-1). Keep **build/process docs in the repo `docs/`** (version-controlled
alongside the code, openable in your editor) and keep **product specs in Notion** (where they
already live). This log can mirror to Notion later if you'd rather read it there.

---

### D2 — How new decisions get recorded 🟡
**The question:** When we settle something, does it become (a) a Build Plan refinement,
(b) a new ADR, or (c) a build-rulebook rule?

**Why it matters:** Without a simple rule we'll either over-document (an ADR for trivia) or
lose decisions in chat.

**Proposed solution:** Use a simple test. **Costly to reverse → new ADR** (e.g., how the
server is layered). **A rule we follow while coding → the build rulebook** (e.g., the Leak
Test below). **A tweak to an existing plan → edit the Build Plan.** Every decided item here
notes which path it took.

---

### D8 — How the 34 Build-Plan app ADRs get numbered in `docs/adr/` 🟡
**The question:** `docs/adr/` currently holds `0001`–`0003` (skill-system routing, CI-defer,
and internal layering). Separately, the Build Plan contains **34 app ADRs numbered ADR-1 …
ADR-34** (TypeScript, Supabase, guardrails, etc.). When those get formatted into `docs/adr/`
files, the numbers **collide** — Build-Plan "ADR-1" (TypeScript) is not file "ADR-0001"
(routing). How do we reconcile them?

**Why it matters:** `docs/adr/` is meant to be one chronological series. A collision means
broken cross-references and ambiguity about which "ADR-16" someone means. Settle it *before*
the formatting work so it's done once, not retrofitted.

**Proposed solution:** Keep `docs/adr/` as a **single series**. Leave `0001`–`0003` as-is;
format the 34 app ADRs as new sequential files starting at **`0004`**, and in each note its
origin ("Formerly Build Plan ADR-N") for traceability. Until a file exists, keep referring to
them as "Build Plan ADR-N" (as ADR-0003 already does); once formatted, update references to the
new file numbers. Lock the exact scheme when we tackle the ADR-formatting task.

---

## B. Architecture decisions from Week 4 lecture (Enterprise Application Architecture)

### D3 — Logical layers inside the Next.js server ✅
**Decided (2026-11-08) → [ADR-0003](adr/0003-internal-server-layering.md).** Adopted the three
internal layers (Presentation → Service → Domain → Data Source) as a folder convention;
`lib/domain/` and `lib/data/` scaffolded under `studio/`.

**The question:** How do we organize the code *inside* the app server? The lecture (Fowler)
splits server code into **Service** (the "front door" API routes, e.g. *Run Co-Pilot*) →
**Domain** (the core rules — your guardrails, risk-tiering) → **Data Source** (all the
Supabase queries, kept in one place).

**Why it matters:** Your specs already nail the three *physical* tiers (browser → Vercel →
Supabase) and "the client is a pure view" (ADR-10). But the *internal* organization of the
server isn't named yet. Naming it protects **maintainability** — a new reader (or a future
Claude session) can find the business rules, and queries don't get scattered everywhere.

**Proposed solution:** Adopt the three internal layers as a **folder convention** (e.g.
`app/` routes = Service, `lib/domain/` = Domain rules, `lib/data/` = Supabase access). Record
it as a **new ADR** because it's a structural choice that's annoying to undo later. This also
reinforces your existing rule that guardrails are code *outside* the model (ADR-16).

---

### D4 — The "Leak Test" as a review rule 🟡
**The question:** Do we adopt the lecture's Leak Test as a standing check? *"Could you swap
the browser for a command-line script and keep all the governance intact? If you'd have to
copy logic into the UI to do that, the logic is leaking into the wrong layer."*

**Why it matters:** For a **governance** product this is high-stakes — a guardrail that lives
in a React component is a guardrail an attacker (or a bug) can skip. It's also a concrete,
checkable rule, not a vague principle.

**Proposed solution:** Adopt it, and put it in the **build rulebook's Definition of Done**:
"No business/governance rule in a presentation component; the server must enforce every
guardrail on its own." (Pairs with your NFR-S1/S2.)

---

### D5 — Domain logic pattern for the guardrails 🟡
**The question:** The lecture offers three ways to organize business logic — Transaction
Script (simple step-by-step functions), Table Module, or Domain Model (rich objects). Which
fits our guardrail / risk-tiering logic?

**Why it matters:** Picking consciously keeps the code as simple as the problem actually is
(YAGNI) instead of over-engineering.

**Proposed solution:** **Transaction Script** — plain, deterministic functions, one per
check. The lecture says this suits "straightforward business rules," and it matches your
ADR-27 (guardrails as pure, unit-testable functions). No need for a heavy object model yet.
Likely a one-line note in the Build Plan, not its own ADR.

---

### D6 — Scalability stance for the MVP 🟡
**The question:** Of the lecture's four promises (Reliability, Scalability, Maintainability,
Security), scalability is the one the MVP deliberately does *less* on. Do we confirm that as
an on-purpose deferral?

**Why it matters:** The lecture wants scalability *decisions* made, not left silent. Your
ADR-14 already chose synchronous requests / no job queue for the MVP — that's a legitimate
small-scale choice, but it should be stated as deliberate, with the revisit-trigger named.

**Proposed solution:** Confirm **"scalability deferred on purpose for MVP"** — synchronous,
no queue (ADR-14) — and name the trigger to revisit (Workflows / rung 3, or real multi-org
load). A sentence in the Build Plan; no new ADR needed.

---

## C. Now-due items (decisions whose "wait" has expired)

### D7 — Stand up the CI quality gate 🔵
**The question:** ADR-0002 deferred building the CI gate (the automatic checker on every Pull
Request) until app code arrives. App code is arriving now. Do we build it as part of Epic 0
foundations?

**Why it matters:** ADR-0002 explicitly says *"revisit at the start of Week 3; if it slips,
the gap persists silently."* We're past that. Your Release 1a scope already lists "CI quality
gate" in Epic 0, and NFR-O1 specifies the exact checks.

**Proposed solution:** **Yes — build it in Phase 0**, wired to the checks in NFR-O1 (ESLint ·
Prettier · `tsc --noEmit` · unit tests · `next build` · dependency scan · secret scan). When
done, write an ADR that **supersedes ADR-0002** (don't edit the old one — your README's
immutability rule).

---

## Parking lot (raise later, not blocking Release 1a)

- **Email / notification service** (NFR-T8, e.g. Resend/Postmark) — only needed for staff
  invites, which are deferred to Release 1b. Supabase Auth covers 1a's verification emails.
- **Measurable eval thresholds** (PII recall %, catch-rate) — baselined during Step 7 once
  real golden data exists; PII itself is a 1b feature.
