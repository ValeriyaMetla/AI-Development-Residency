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
- 2026-11-18 — [Claude Code · Lane A spine · main] — **Risk-3 resolved (ADR-0027).** Did: the pipeline
  now tells a policy-rules READ FAILURE from an empty policy (`getPolicyRulesOrNull`); on failure it
  still runs on baseline, but the rule-check records a disclosure **flag** → `needs_review` via the
  approval gate (ADR-0020), and stamps `policyUnavailable` on the audit (chosen **Option A**: degrade
  + disclose + force review, not block). **No migration.** `pipeline.ts` + 2 new `pipeline.test.ts`
  tests; fixed `policy-propagation.test.ts`'s mock (it mocked the old `getPolicyRules`). `npm run
  verify` green (**363 tests**, build, arch-gate). ADR number: used **0027** (next repo file — note
  the many `ADR-27`/`ADR-0027` code comments mean the *Build-Plan* ADR-27, a separate scheme worth a
  cleanup). **Uncommitted — code via PR** (`pipeline.ts` + the two tests); ADR-0027 + this log +
  outline are docs (straight to main). Next: Chunk 4 tail ([Should] expert defaults / org overrides /
  export) or start Coaching (Epic 6).
- 2026-11-18 — [Claude Code · Lane A spine · main] — **Chunk 4 rule suggestions — all 4 cards Done.**
  Did: spec `docs/specs/epic-1-rule-suggestion-logic.md` + ADR-0025 (`c59a1ac`); detect (`5b15b9b` —
  pipeline now logs risky-use pattern ids in the audit payload); surface + dedup (`4a8c2d4` — migration
  `20261118050000_rule_suggestions.sql`: `suggested` origin, `policy_rule.suggestion_key`, append-only
  `rule_suggestion_decision`); accept/dismiss flow (`b65da4b` — leader-only section on `/policy-seed`,
  accept re-derives server-side and publishes a new version via ADR-0024). Migration now RUN in
  Supabase (verified: rules load again). ⚠️ Lesson: card 3 reached `main` before the migration ran →
  rule reads failed silently ("no rules yet") until it did; run migrations BEFORE pushing code that
  reads new columns. In progress: none. Next: (1) manual keyboard/screen-reader pass on a real
  suggestion once 3+ runs of a pattern exist (counted from `5b15b9b` on); (2) new cards for two
  pre-existing risks — `getPolicyRules` returns `[]` on error so the page shows "no rules yet", and
  `publishRuleEdits` could publish without baselines if that read fails (accept is already guarded);
  (3) optional: seed Q6 "myself" wording in a locked rule. Cards 2–4 went straight to `main` (no PR).
- 2026-11-18 — [Claude Code · Lane A spine · main] — **Chunk 4 verify cards.** Did: "Verify a rule
  change propagates" — `studio/test/policy-propagation.test.ts` (6 tests; real edit → publish →
  next-run path over an in-memory policy store; mutation-checked; `npm run verify` green) pushed to
  `main` as `9804f84` (no PR — test-only); card → **Done**. Finding: no editor action can flip a
  guardrail outcome on a seeded policy (the `data-protection` rule is a locked baseline), so the
  proof is draft/self-critique grounding + baseline survival. In progress: "Verify the 5-minute
  promise" → **In Progress** — manual only (seed has no AI call; time is the person's). Next (Val):
  run Notion "Week 5 Manual Test Case Scenarios" → Test Case 1 with a non-expert (not the builder);
  time from first seed question to Activate; ≤5:00 + friction notes → move card to Done. Optional
  question-budget guard test was considered and skipped (YAGNI). Check the Actions tab for `9804f84`.
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
