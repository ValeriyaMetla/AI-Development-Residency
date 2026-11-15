# Handover — Release 1b (Frontline-Doer journey + the rest of MVP #1)

**For:** the next chat (AI agent) + Val, picking up **Release 1b** of Community AI Workflow Studio.
**Date:** 2026-11-14

---

## ⚠️ How to start (read this FIRST, AI agent)

**Orient and wait — do not produce.** Your first job:

1. **Review** this handover + the shared context in [`docs/handovers/epic-1-handover.md`](epic-1-handover.md)
   (§1 project, §3 source links, §4 codebase, §5 skill governance, §7 working norms — all shared;
   not repeated here) and the Release scope in Notion (links in §6).
2. Give Val a **short, plain-language orientation** of what Release 1b is and the first candidate
   pieces (§3).
3. **Stop and ask Val what to build first** — build, draft, or propose _nothing_ until she directs
   each step, one move at a time.

Val works step by step and wants to stay in the loop and learn. When in doubt, **ask rather than
produce**. Full final versions of any deliverable (not diffs). Show your reasoning. Run the project
**routing check** (root `CLAUDE.md`) before producing, and close every working turn with a 🧾
**skill-usage receipt**.

---

## 1. What this project is (one paragraph)

**Community AI Workflow Studio** (the "Governed AI Ladder") helps small nonprofits use AI safely and
fairly: set your rules once, run everyday tasks with a safety net, grow your policy by using it. The
audiences are the **Accountable Leader** (non-technical ED/Ops) and the **Frontline Doer** (comms/
program staff using AI daily). Stack: **Next.js 15 (App Router) + TypeScript + Material UI + Supabase

- Claude API (Sonnet)**; the app lives in the **`studio/`** subfolder of repo
  `ValeriyaMetla/AI-Development-Residency`. (More in `epic-1-handover.md` §1.)

## 2. Where we are — **Release 1a is COMPLETE and live on Vercel**

The entire **Accountable-Leader journey** is built, merged to `main`, and deployed:

- **Epic 0 — Foundation:** Next.js+TS+MUI scaffold; Supabase + Auth + default-deny RLS (per-org
  isolation); core data model + migrations; append-only audit log; the **governed-run pipeline**
  (`studio/lib/domain/pipeline.ts`); the **standards library** (`standard`/`standard_rule`, 3
  frameworks + 9 cited rules); CI quality gate + arch-gate.
- **Epic 1 — Set your rules:** the ~5-min **policy-seed intake** (wizard at `/policy-seed`), the
  **generator** (answers → plain-language policy grounded in standards), and **inheritance** (every
  governed run reads the active policy via `getActivePolicy`/`getPolicyRules` and folds it into the
  prompt via `withPolicyContext`; `task_run.policy_id` is stamped).
- **Epic 4 — Governance Co-Pilot (the hero):** "should we use AI for this, and how?" at **`/copilot`**
  (linked from the dashboard). **Transparent risk-tiering as deterministic code** (ADR-0010):
  `lib/domain/copilot.ts` (signals → 4-tier EU-AI-Act scheme → verdict), `copilot-grounding.ts`
  (code-attached citations, no fabrication), `copilot-pipeline.ts` (assess-then-narrate), the
  `copilot_assessment` table, and the MUI screen (`app/copilot/`). Full design spec:
  [`docs/design/epic-4-copilot-design.md`](../design/epic-4-copilot-design.md).
- **Epic 2 — See the record:** automatic `audit_event` logging of every governed run/assessment
  (who/what/when/which policy, no sensitive content — ADR-6).
- **Epic 5 (1a slice):** **provenance labels** on output + the **deterministic policy rule-check**
  (ADR-0014, `lib/domain/guardrails.ts` — category-driven, injection-proof; blocks empty output,
  flags contact details when a data-protection rule is active).

All Release-1a MVP #1 Kanban tickets are **Done**.

## 3. What Release 1b is (the scope)

Per the **Product Release Vision & Scope** (Notion) "Deferred to Release 1b" list — the
**Frontline-Doer journey + the rest of MVP #1**. Five build chunks, dependency-ordered (map produced
during the 1a work):

**1b-① The governed-task experience + its full safety net ⭐ (the heart — highest value)**

- **Epic 3:** the governed **Skill runner**, the **"Draft a thank-you" Skill** (currently a
  walking-skeleton dummy — productionize it), the **self-critique** ("Challenger") pass, tone check.
- **Epic 5 (rest):** **human-approval gate** (show what's being approved, no rubber-stamp), **PII
  detection + strip/minimize** (confirm-to-keep, logged), **risky-use flagging** (tuned for low
  false-positives), in-the-moment PII warning.
- _Why first:_ proves the second half of the core bet ("will staff reuse a governed Skill?"); its
  logging/activity feeds everything below.

**1b-② The Leader sees & grows the policy**

- **Epic 2:** usage **dashboard** (totals by type/staff/time) + empty state, per-user "my entries".
- **Epic 1:** **editable rule set**, **living-policy suggestions** ("accept suggested rule"),
  export/portability _(Could)_.
- **Epic 4:** Co-Pilot **expert defaults + org overrides** _(Should)_.

**1b-③ Funder-ready proof** — **Epic 7:** audit-trail view (tamper-evident) + one-click
responsible-AI export (honest about low data).

**1b-④ In-the-moment coaching** — **Epic 6:** in-task coaching (guide, not scold) + dismiss/no-nag,
safer-way suggestions, make-the-safe-path-easiest.

**1b-⑤ Packaging** — **Epic 8:** polished self-serve onboarding (minutes-to-value, resume),
free-tier gating, staff invite. _(Wraps Epic 1 + 3, so it goes last.)_

**Suggested order:** ①→②→③→④→⑤ (matches the Build Plan's Phases 2→3→4). **Deferred to MMP:** Epic 9
Workflows, Epic 10 Justice Layer.

The Kanban board ("Tasks Go Here", Notion) has the 1b tickets in **Backlog** with **Release = `1b`**;
groom them as you go (move to In Progress → Done when working on the live app).

## 4. The codebase (build on this)

- **Layering (ADR-0003, enforced by `studio/scripts/arch-gate.mjs` + `arch-gate.config.json`):**
  Presentation (`studio/app`) → Service (route handlers / `actions.ts` server actions) → Domain
  (`studio/lib/domain`, pure rules) → Data-Source (`studio/lib/data`, the only place touching
  Supabase or the Claude SDK). The arch-gate bans `supabase.from(`/`createClient(`/SQL and the
  `@supabase/*` + `@anthropic-ai/sdk` imports in the UI/Domain layers.
- **The one governed-run pipeline** (`lib/domain/pipeline.ts`): context (load skill + active policy)
  → draft (Claude, policy-grounded) → self-critique (STUB — 1b builds the real Challenger) → rule-
  check (`guardrails.ts`) → provenance → persist + audit. **Every Skill flows through this**; adding
  a Skill = defining its steps, not re-implementing governance.
- **Key files to study:** `lib/domain/pipeline.ts`, `lib/domain/guardrails.ts` (the rule-check
  registry — add new deterministic checks here), `lib/data/policy.ts` + `lib/data/standards.ts` +
  `lib/data/runs.ts` (data accessors), `lib/data/claude.ts` (the only Claude call), and
  `lib/domain/copilot*.ts` + `app/copilot/*` as a **reference for a full feature build** (ADR →
  migration → domain engine + tests → data accessor → pipeline → MUI UI).
- **Reference docs:** `docs/reference/week-4-technical-architecture.md`, `docs/reference/architecture.md`
  (three-tier inventory), `docs/reference/database-erd.md` (ERD), and read **every ADR in
  `docs/adr/`** before changing app code; write a **new ADR** for every costly-to-reverse decision.

## 5. How to work (ops you'll need — learned the hard way in 1a)

- **Build gate before "done"/PR** (`docs/BUILD-RULEBOOK.md`): run the full verify locally —
  `cd studio && npm run format:check && npm run lint && npm run typecheck && npm run test:run &&
npm run build`, plus `node scripts/arch-gate.mjs --changed --base main` from the repo root. A fresh
  worktree has **no `node_modules`** until you `npm ci` (Node 20 in the sandbox).
- **Prettier is pinned at 3.9.10** — use the project's version (`npm run format` / `npx prettier@3.9.10`).
  Do NOT use bare `npx prettier` (it pulls a newer version that flags unrelated files). A format
  mismatch is the #1 way CI goes red.
- **Git flow is Val's, in GitHub Desktop.** `gh` is NOT installed; CLI has no push credentials. So:
  write/edit files and **leave them uncommitted** — Val commits, pushes, and opens/merges PRs herself.
  Offer a commit-message suggestion. To merge: **Branch → Create Pull Request** (there are look-alike
  `claude/...` branches/PRs — make sure she picks the Release-1b one), then Merge on github.com.
  (See memory/CLAUDE.md note: don't commit from the CLI.)
- **Migrations:** write the `.sql` in `studio/supabase/migrations/` (copy an existing one's patterns —
  org-scoped RLS via `current_org_id()`, child-via-parent for child tables, least-privilege by which
  policies exist). Then **Val runs it in the Supabase SQL Editor** — when it enables RLS itself, she
  picks **"Run without RLS"**. Keep seed text plain ASCII.
- **Skills + receipts:** run the routing check (place the task in `docs/SKILLS-LIBRARY.md`'s taxonomy,
  always check the cross-cutting standards — `secure-coding`, `testing-code-review`, `accessibility`+
  `ux-usability`, `documentation`, `judge-arch`, `responsible-ai`), state routing in one line, and
  close with a 🧾 receipt.

## 6. Materials (sources of truth)

- **Product Release Vision & Scope** (the 1b scope): https://app.notion.com/p/403975c3b950808181c1ceb0c6ec461f
- **Epics and Features** (feature user stories + Given/When/Then): https://app.notion.com/p/403975c3b9508069992efc421bac8942
- **Build Plan** (build sequence + ADRs): https://app.notion.com/p/406975c3b95080c89afae6843325616c
- **Kanban board** ("Tasks Go Here"): https://app.notion.com/p/3f9975c3b95080a88e79c1b79dbff0b6
- Repo: `ValeriyaMetla/AI-Development-Residency` (app in `studio/`).

## 7. Your first move (AI agent)

Read §3 and the board's `Release = 1b` tickets, skim the key files in §4 (especially `pipeline.ts`,
`guardrails.ts`, and the Co-Pilot feature as a reference), then give Val a plain-language orientation
of Release 1b and **ask her which chunk/ticket to start with** (likely **1b-①**: the governed Skill
runner + self-critique, or the human-approval gate). Build nothing until she says go.
