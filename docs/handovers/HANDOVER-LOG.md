# Handover Log

A running log for work handed off across accounts and sessions on this repo
(personal account + Tech Fleet seat; Claude Code + claude.ai chat). Whoever picks the work
up reads the top entry to continue without re-deriving context. Syncs via Git.

## How to use
**Log only at handoff points** — when you switch accounts or stop for the day. Not every
change, not every message; if you're heads-down in one account, there's nothing to write.

When you do log, add a dated entry at the TOP with:
- **Who/where:** account (personal / Tech Fleet) + surface (Claude Code, or which claude.ai chat).
- **Code also:** the branch / worktree you are building in.
- **What:** one or two lines — did / in progress / next, plus anything the next session needs.

Pull before reading; commit + push right after writing. Newest first.

Entry format:
`- YYYY-MM-DD — [account · surface/chat · branch/worktree if Code] — did / in progress / next`

## Log (newest first)
- 2026-11-18 — [personal · Claude Code · main] — **Reversed the two-tier skill-sync model** (set up
  2026-11-17, see entry below) → **one complete commit per skill**: `SKILL.md` + `CLAUDE.md` line +
  full `SKILLS-LIBRARY` catalog entry + any neighbor-boundary edit, together; no deferred catalog
  sweep. Also healed red `main`: added the `ci-cd-pipeline` catalog entry (sync gate: built 21 ≠ 22
  real skills) and ran prettier on `lib/domain/entitlements.ts` + `test/entitlements.test.ts`. Did:
  edited CLAUDE.md step 3 + the two matching spots in SKILLS-LIBRARY.md, plus a step-6 scope clause.
  **Uncommitted** (docs → straight to `main`). Next: the other account should drop any two-tier
  assumptions; skills-gate enforces catalog-sync on every push.
- 2026-11-18 — [Claude Code · Lane A spine] — Started **Chunk 4 (Living Policy)**: the editable rule
  set. Did: **ADR-0024** (edit = publish a new policy version, never in-place; baseline rules
  **locked**); pure `lib/domain/policy-edit.ts` (parse + assemble) split from server
  `lib/domain/policy-publish.ts` (create→insert→activate — reuses existing writers, **no
  migration**); leader-only `publishRuleEdits` action; `/policy-seed` now branches (active policy →
  editor for a Leader / read-only for a Doer; none → seed wizard) via `policy-editor.tsx`; tests
  (`policy-edit.test.ts`, 9). `npm run verify` green for my files (234 tests, build, arch-gate).
  Split pure-vs-data modules so the client bundle stays server-free (caught in build). **Uncommitted
  — needs a code PR** (new rule: code via PR, docs straight to main). Notes: ADR-0023 was taken by
  the free-tier lane → mine is **ADR-0024**; their `lib/domain/entitlements.ts` is unformatted
  (theirs to fix). Next: Chunk 4 **Should** cards (registry → rule suggestions) + **Could** (export);
  baseline handling is **locked**, stronger than the spec's confirm-to-override.
- 2026-11-18 — [Claude Code · Lane A spine] — Built **Chunk 2 Wave 3 — all 3 cards** (human-approval
  gate). Card 1: ADR-0020 + `approval` migration (`20261118000000`, append-only, org-scoped RLS);
  `listPendingReviews` + `recordApproval` (`lib/data/runs.ts`); `parseReviewInput`
  (`lib/domain/approvals.ts`); `/approvals` queue + shared `review-actions.tsx` (also inline on the
  Skill-runner `needs_review` result); nav entry; `taskRunId` on `RunResult`. Card 2 (no rubber
  stamp): approve gated behind a required acknowledgement checkbox; reject stays free. Card 3
  (editing + provenance, **ADR-0022** + `20261118020000_task_output_edited_by` migration): reviewer
  may edit the draft; an edit appends a new `task_output` version marked `edited_by` (AI original
  kept); provenance composed from run state in `lib/domain/provenance.ts` ("edited and approved by a
  person"). Decisions: any org member approves (self-approval MVP); edits version, never overwrite.
  `npm run verify` green (build, tests, arch-gate). **COLLISION RESOLVED:** Lane B took ADR-0021 +
  migration `…010000` for the correction flow (same folder, in parallel) — I yielded, renumbered to
  ADR-0022 and migration `…020000`. No data overlap (their `run_correction` table doesn't touch
  `task_output`). **All uncommitted.** Next (Val): run **three** migrations in Supabase with "Run
  without RLS" (`…000000` approval, `…010000` correction [Lane B], `…020000` edited_by); commit Lane
  A and Lane B as **separate** PRs; sync with the Lane B chat so you don't both commit at once.
- 2026-11-17 — [personal · claude.ai skill-sync chat] — Stood up the two-tier sync model (Tier 1 operational = skill file + `CLAUDE.md` line; Tier 2 recording = catalog/log, on-demand sweep). Did: loosened the "same commit" rule (`819b5ff`); added `skill-authoring` v1.1 (`ed6a29e`); this commit = full sweep for it + `skill-evaluation` v1.1 routing boundary. Next: re-upload the `skill-evaluation` zip to the personal account; reconcile runbook↔operating-model account-upload wording.
- 2026-11-17 — [personal · claude.ai planning chat] — Setup/cleanup session. Confirmed
  cross-account setup (GitHub + Notion are the shared bridges; `main` is source of truth).
  Release 1b: `main` is ahead of the Notion board and the build-outline doc (~19/48 built).
  In progress: none. Next buildable focus: finish Chunk 2's reviewer UI (human approval/review
  screen + provenance-updates-on-human-edit).
