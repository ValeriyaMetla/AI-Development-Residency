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
- 2026-11-19 — [Claude Code · Lane C (2nd account) · `worktree-policy-review-honest`] — **Policy review screen made honest + MVP #1 near-complete.** Board: `Verify the 5-minute promise` + `Download the policy as a readable document` → Done (Val tested; PDF good); Co-Pilot clarity cards Done (PR #94). Val's onboarding test (fresh sign-up `test-onboarding1@example.com`; email confirmation is off) found the review screen read-only but signalling actions it doesn't have. Built `Make the policy review screen honest about what can change` [Should, Epic #1]: "🔒 Safety floor — always on" on locked rules (review + editor), "Needs review" only where editable (Domain `showsNeedsReview`, count matches), tag key, honest note. Tests `policy-review-labels.test.ts` (6); `npm run verify` green (477), arch-gate PASS; editor label checked in the browser; the review screen itself not seen live (needs an unactivated draft). **Uncommitted — code via PR.** Next: Val finishes the onboarding run (Activate → Run your first Skill → note time) → flip `Build the minutes-to-value onboarding flow` to Done → Release 1b / MVP #1 complete. Possible MMP cards (not created): edit/mark-reviewed before activation; confirm-to-override floor rules (new ADR).
- 2026-11-19 — [Claude Code · Lane C (2nd account) · `worktree-copilot-question-hints`] — **Release 1b review + Co-Pilot clarity.** Checked 1b against `main`: six code-merged cards were stale on the board → moved to Done (coaching ×4, audit trail, unblock guidance). Val **dropped the four "Not sure" cards** (Notion trash) in favour of two smaller ones, both built in one PR: `Require a "none of these apply" confirmation on the Co-Pilot` [Must] (a blank form can no longer return "Go ahead"; Domain rule + server enforcement + form) and `Explain each Co-Pilot question in plain words` [Should] (one-line explanation per question, `aria-describedby`). Tests `copilot-questions.test.ts` (8); `npm run verify` green (471), arch-gate `--all` PASS; blank-submit + tick/untick checked in the browser (no assessment submitted — would write to live data). Outline: Not-sure section replaced, unblock line fixed, totals now a board snapshot (51: 46 Done, 3 In Progress, 2 In Review). **Uncommitted — code via PR.** Next: Val reviews the 5 explanation lines, commits + opens PR; on merge flip both cards to Done. Remaining for MVP #1: manual 5-minute verify, onboarding click-through, readable-document review.
- 2026-11-19 — [Claude Code · Lane A spine (2nd account) · main] — **Seed-answer clean-up (found on real data via the policy document).** `validatePolicySeedAnswers` now drops filler Q7 limits (exact-match "none", "n/a", "nothing else"… — a real limit like "None of our client files go into AI" is kept) and treats a "me"/"myself" Q6 reviewer as the accountable person, so rules never read "none" or "myself reviews…". New policies only; existing ones can delete/edit in the rule editor. Tests in `policy-seed-validate.test.ts` + `policy-seed-spec.test.ts`; `npm run verify` green (463). Card *Download the policy as a readable document* → In Review. Still open (later): upgrading existing policies to the new "we" wording.
- 2026-11-19 — [Claude Code · Lane A spine (2nd account) · main] — **Readable policy document (new card *Download the policy as a readable document*).** Val found the export was JSON-only. Did: pure builder `lib/domain/policy-document.ts` + 13 tests; seed rules re-worded in one "we" voice (Val-approved; new policies only) — both committed `445533d`. Then the Leader-only `/policy-seed/document` page (Print / Save as PDF via the report's `PrintButton`), **Download policy document** + relabelled **Download backup file (for re-import)** on `/policy-seed`. `npm run verify` green (456 tests); page checked in the browser on the dev org. Found on real data: existing policies keep the old instruction-style wording; a custom limit saved as "none" shows as clause 3.4; reviewer "myself" reads as "myself reviews…". Next: Val's call on those three; card → In Review on commit.
- 2026-11-19 — [Claude Code · Lane C (picked up in 2nd account) · `worktree-lane-c-summary-export`] — **Report cards 3 + 4 built, one PR.** Moved card 4's composer (`9659294`, stranded on the already-merged `worktree-lane-c-report`; PR #91 later merged that original into `main` too — this PR's copy is a strict superset, conflict resolved by keeping it) onto a fresh branch from `main`; built card 3: all-or-nothing `getSummaryInputs` in `lib/data/report.ts` (failed policy/approvals/runs read → summary error, never "no policy" / "0 reviewed"; "Reviewed by a person" = distinct runs with a decision; reads no `note`), `allTimePeriodLabel`, Governed AI Summary + Print / Save as PDF on `/report`, print CSS hides app chrome (`app-shell.tsx`). Tests: reader (7, mocked DB) + no-content select allow-list (red-green checked); `npm run verify` green (430), arch-gate `--all` PASS; clicked through on real data (Riverside Shelter). **Uncommitted — code via PR**; board cards → In Review. Not verified: the actual print dialog/PDF (Val), empty + error states live (unit-tested only). Next: Val commits + opens PR; on merge flip both cards to Done and delete `worktree-lane-c-report`.
- 2026-11-19 — [Claude Code · Lane A spine (2nd account) · main] — **Resume-after-interruption closed + seed actions Leader-only.** Did: `/policy-seed` resumes an unactivated draft at its review screen on any device (`getLatestDraftPolicy`, `saved-draft-review.tsx`), with a confirmed **Start over** that archives the org's drafts (`archiveDraftPolicies`, `discardDraftPolicy`; never deletes, no audit event). Shared `policy-activated.tsx`. Generate/Activate/Start over now refuse non-Leaders server-side (fail closed); a Doer with no policy sees a message instead of the wizard. Tests added (actions + data layer); `npm run verify` green (419 tests). Committed by Val. Board: *Add resume-after-interruption to onboarding* → **Done** (AC 2 note added); new card *Save half-finished policy-seed answers server-side* [Should · MMP · Backlog]. Not browser-tested. *Build the minutes-to-value onboarding flow* → **In Review** (Done after one live sign-up → first-run click-through). Next: ping Lane D that #1 + #2 + draft resume landed.
- 2026-11-19 — [Claude Code · Lane A spine (picked up in 2nd account) · main] — **Lane D's 3 Lane-A-coupled onboarding pieces: #1 + #2 built, #3 deferred.** #1: "Run your first Skill →" on the policy-active screen. #2: "Use recommended answers" fast path on `/policy-seed` — `recommendedSeedAnswers()` (protective: risk questions `not_sure` = every safety rule on; leader's display name pre-filled; 3 everyday purposes) → generates → **normal review screen, leader still clicks Activate** (Val chose to keep the review step over auto-activate). `PURPOSE_OPTIONS` moved into `policy-seed-spec.ts` (one list for wizard + defaults). Tests `policy-seed-recommended.test.ts` (6); `npm run verify` green (407 tests, build), arch-gate `--all` PASS. **Uncommitted — code via PR** (4 code files). Not clicked through in a browser (needs a signed-in leader with no policy). #3 (server-side partial answers) stays deferred per Val's 2026-11-18 call. Next: Val opens the PR; tell Lane D #1 + #2 landed; flip cards 11 on merge.
- 2026-11-19 — [Claude Code · Lane A spine · main] — **Export + re-import policy built (Epic 1, the
  last Lane A card).** Did: pure `lib/domain/policy-export.ts` (`serializePolicy` → portable JSON with
  no org/row ids; `parsePolicyImport` validates untrusted input, rejects malformed cleanly, preserves
  baseline flags + citation provenance, drops the internal `standard_rule_id`); `publishImportedPolicy`
  in `policy-publish.ts` (versioned publish via ADR-0024, audited as `policy_edited` + `source:import`
  — **reuses an allowed audit kind, no migration**); leader-only `exportPolicy`/`importPolicy` actions;
  `policy-portability.tsx` on `/policy-seed` (Download policy + Import from file). Tests
  `policy-export.test.ts` (11 — round-trip into a fresh org + malformed-reject). `npm run verify` green
  (build, arch-gate, tests). **Uncommitted — code via PR** (6 files); board card → **In Review** (flip
  to Done on merge); outline + this log are docs. **→ Lane A is now COMPLETE** — every card built or
  verified-as-met; only the manual 5-minute verify remains (Val's).
- 2026-11-19 — [Claude Code · Lane A spine · main] — **Expert-defaults pair closed by review — no build.** Pulled the exact
  Kanban cards: *Ship sensible expert defaults* + *Allow org overrides that persist* (both Epic #4,
  [Should]). Verified against the code: expert defaults = the baseline safety net (ADR-0018) + the
  Co-Pilot's deterministic standards-grounded engine, applied to every org with no setup; "overrides
  that persist" = the rule editor (ADR-0024) — change persists + applies next run, baseline locked /
  can't disable — matching both acceptance criteria exactly. Both **moved to Done** on the board (Val
  agreed); **no code**. Build outline updated (Lane A Chunk 4 → 8/10). Lane A remainder: `Export +
  re-import policy` [Could] and the manual 5-minute verify — **no required build left in Lane A.**
  (2026-11-19: also reviewed `Make the governed option the default low-friction path` [Should] →
  **Done** by existing work — the Doer home leads with the Run-a-Skill primary CTA, no ungoverned
  path, coaching makes the safe option one click.)
- 2026-11-18 — [Claude Code · Lane A spine · main] — **Coaching (Epic 6) — 4 Must cards Done.** Did:
  pure `lib/domain/coaching.ts` turns the existing risky-use signal into an in-the-moment nudge
  (guide-not-scold `info` tone), with a per-pattern **safer rewrite** the Doer can apply ("Use the
  safer way" rewrites the input to a safe task) or **dismiss** (no-nag this session); a safety/crisis
  pattern offers no AI rewrite and points to a person instead. Wired live into the `/skills` runner
  (mirrors the live PII warning). Cards done: *Build in-task coaching (guide, not scold)*, *Offer
  concrete safer alternatives in the moment*, *Apply the safer way on accept*, *Add dismiss/no-nag*.
  Card *Make the governed option the default low-friction path* [Should] left (partly served). Tests
  (`coaching.test.ts`, 4 — incl. the guarantee that each rewrite no longer trips any risk pattern).
  `npm run verify` green (build, arch-gate, tests). **No migration, no ADR** (migration-free UI/domain
  feature). **Uncommitted — code via PR** (`coaching.ts`, `skill-runner.tsx`, test); this log + outline
  are docs. Next: Chunk 4 tail, or Report (Epic 7, Lane C).
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
- 2026-11-19 — [Claude Code · Week 6 security skills] — Did: `secure-coding` v2.0 (OWASP Top 10:2025, eval 28/28 vs 26 v1 / 25 none; `470b6dd`) + doc/neighbor sync incl. `responsible-ai` v1.1 (`90ca354`). In progress: none. Next: add the study guide to `docs/reference/`, then build `security-testing`, then the PenTest + research report. Full brief: [`week-6-security-handover.md`](week-6-security-handover.md).
