# Lane C — Reporting (Epic #7, Chunk 5) — handover · 2026-11-18

## ⚠️ How to start — orient and WAIT
1. **Review** the materials below (repo + the 4 Notion cards + this doc).
2. Give Val a **short, plain-language orientation**: where Lane C stands, what's next, open items.
3. **Stop and ask Val what the next step is.** Build, draft, or propose nothing until she directs
   each step, one move at a time. Follow root `CLAUDE.md`: routing check first, full final versions
   (not diffs), 🧾 skill receipt every working turn. Val works step by step and wants to stay in the loop.

## Scope — exactly these 4 cards (Notion "Tasks Go Here", Release 1b, Chunk 5, Epic #7). Read-side only; never touch the spine.
1. `Build the audit trail from registry data` [Must] — **Domain layer BUILT this session; reader + page NOT built.** ← in progress
2. `Ensure audit entries can't be silently altered` [Must] — **built + merged** (ADR-0026). Board = Done. ⚠ confirm the migration is applied (below).
3. `Build one-click responsible-AI summary export` [Must] — spec blank; decisions approved; not built.
4. `Handle low-data honestly in the summary` [Must] — spec blank; decisions approved; not built.

**Build order:** card 1 (finish it) → cards 3 + 4 spec'd and built together.

## Decisions approved (don't re-litigate)
**Card 1's three open questions — settled this session (Val confirmed her card leans):**
- **Who did it:** "You" / "Another team member" — **NOT names.** Names would need a new org-wide
  `profile`-read RLS rule (today `profile_select_own` is own-only; a policy that reads `profile` from
  within `profile` hits an infinite-recursion trap — use the `SECURITY DEFINER` org-id helper if ever added).
- **Where it lives:** one Leader-only `/report` page (trail now, export later), in the nav.
- **Default range:** all time, newest first, 50/page, "Show older entries." The time/kind filter (US7) is a [Should], after the core.

**Earlier locked Lane-C decisions (still in force):**
- Summary is **templated from the data, not model-written** (no fabrication, card 4 provable, no cost).
- Export = **printable `/report` + browser "Print / Save as PDF"** (no PDF library); **Leader-only**, server-side. CSV later Could.
- Insert integrity is **DB-level; no hash chain in 1b** (ADR-0026).
- A failed audit write shows **"Part of this run's record is missing"** (the gap marker); root fix is Lane A's.
- Correction notes show **that a note was added, by whom, when — never the text** (ADR-0021).

**Card 1 wording table — APPROVED this session** (US2). All 13 live event kinds map to plain language,
plus "Other recorded event" for unknown kinds. The two rule-suggestion kinds got new wording;
`task_completed` = "Run finished — completed / sent for review", `task_blocked` = "Run stopped by a
safety check". The approved copy is encoded in `lib/domain/report.ts` (the single source).

## Done this session
- **Card 1 Domain layer** — `studio/lib/domain/report.ts` (pure, no I/O): plain-language wording for all
  13 kinds, **exhaustive by `AuditEventType`** (a new kind without wording won't compile), "Other
  recorded event" catch-all, `actorLabel` (You / Another team member), `detectRunGaps` (US5),
  `RUN_GAP_MARKER`, and the input types (`AuditRecord`, `AuditDetail`, `TrailActor`, `RunForGap`).
- **Tests** — `studio/test/report.test.ts`: **14 passing** (wording coverage, approved copy, actor
  labels, gap detection). Run with the project's pinned vitest, not `npx` (npx pulls an incompatible rolldown build on Node 20).
- Both files are on branch `worktree-lane-c-report`, being committed by Val now.
- **Also this session (not Lane C app code):** tidied the Kanban (moved `Ensure audit entries can't be
  silently altered` + `Build self-serve setup (no consultant)` to Done); refreshed
  `docs/handovers/release-1b-build-outline.md` (52 tickets incl. 4 new Co-Pilot cards; Lane C statuses firmed).

## Underway / next (planned, not started) — finishing card 1
1. **Data reader** `studio/lib/data/report.ts` (READ-ONLY): read `audit_event` (org-scoped by RLS,
   newest first, paginated via `.range`, `count: 'exact'` for the total), resolve `actor` → you/other
   (`actor === auth.uid()`; null → other), map the **allow-listed** payload into `AuditDetail`
   (categories, ruleCount, verdict/riskTier, correctionKind, outcome, edited), and join run context:
   `task_run → skill.name` (or "Governance Co-Pilot"); `task_run.policy_id → policy.name` +
   `policy.created_at` as "took effect", or `null` → "No active policy — baseline safety only" (US1).
   **To map payload keys accurately, READ Lane A's audit writers (`pipeline.ts`, `runs.ts`, etc.) —
   read-only; do NOT edit them.** `eventWording` already degrades gracefully when a detail field is absent.
2. **`/report` page** (Leader-only) — server component with a server-side role guard like
   `app/(app)/setup/page.tsx` (`profile?.role !== 'accountable_leader'` → a way-forward message, US3).
   Newest-first list; per-entry what/who/when + run Skill + policy version (US1); wording via
   `eventWording`; empty/loading/error states reusing Lane B's usage patterns (US4); gap marker (US5);
   50/page + "Show older" + total count (US6); US7 filter is the [Should], after. Add a **Leader-only
   nav entry**. **WCAG 2.2 AA**: semantic list/table, keyboard + visible focus, 4.5:1, never color-only.
3. **Remaining tests** — the zero-content **counter-test** (feed events/runs containing typed text,
   drafts, note text; assert none appears), then `npm run verify` (full suite + build + arch-gate) green.
4. Then **cards 3 + 4** (export reuses this read path; low-data honesty reuses the empty/low states).

## Gotchas
- **Worktree has no `node_modules`** — this session symlinked the main checkout's (`studio/node_modules`),
  which is gitignored. Any new checkout/worktree needs its own `node_modules` (symlink main's, or install).
- **Don't edit the spine / Lane A files:** `lib/domain/pipeline.ts`, `lib/domain/guardrails.ts`,
  `lib/data/runs.ts`, `lib/data/policy.ts`. Reading them is fine.
- **Re-check `main` before claiming an ADR number or migration timestamp** — Lane A/D move fast; ADRs
  0021–0027 are taken as of this session.
- **Never display `task_run.input_summary`** — the Co-Pilot stores the first 200 chars of raw input
  without PII removal (flagged; a separate Co-Pilot session owns that).
- **`audit-events.ts` is the ONE list of kinds (now 13).** Adding a kind needs a migration replacing
  `audit_event_known_type` + the list edit, or `writeAuditEvent` silently drops it. The trail wording
  must stay exhaustive (`report.ts` is keyed by `AuditEventType`).
- **Card 2 migration-apply (open):** confirm `supabase/migrations/20261118100000_audit_insert_integrity.sql`
  is applied in Supabase (**Run without RLS**) + the check script passes. Unresolved this session — ask Val.

## State
- **Branch / worktree:** `worktree-lane-c-report` at `.claude/worktrees/lane-c-report`.
- **Files added (being committed):** `studio/lib/domain/report.ts`, `studio/test/report.test.ts`.
- **Commit flow:** Val commits/pushes/opens PRs in GitHub Desktop (code via PR; docs to main). Give her
  the file list + a copy-ready commit message together; never commit from the CLI.

## Read first
Root `CLAUDE.md` · `docs/BUILD-RULEBOOK.md` · `docs/adr/` (esp. 0003, 0013, 0021–0026) ·
the card 1 Notion spec (`Build the audit trail from registry data`) · `docs/handovers/release-1b-build-outline.md` ·
`docs/handovers/HANDOVER-LOG.md` (top entries) · this doc.

## Our journey this session (brief)
Started orienting into Lane A's human-approval work → Val redirected to take over **Lane C** → settled
Lane C's four decisions → coordinated branch/worktree after Val's cross-account build session (main had
moved; ADR numbers had shifted) → refreshed the build plan + tidied the board → settled card 1's three
open questions → approved the card 1 wording table → **built + tested the card 1 Domain layer**. Handing
off mid-card-1: the read-only Data reader and the `/report` page remain.
