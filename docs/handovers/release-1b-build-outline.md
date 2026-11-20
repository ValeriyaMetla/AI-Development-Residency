# Release 1b — Build Outline

**Source:** Kanban board "Tasks Go Here" (Notion), filter `Release = 1b` — **52 tickets**
(48 chunked + 4 new un-chunked Co-Pilot cards, added 2026-11-18).
**Refreshed on:** 2026-11-18 (second pass — after Chunk 4 rule-suggestions, audit-integrity, and the
self-serve setup hub landed on `main`). **Owner view:** Val (tracking).

Every item below is the **exact card title**, grouped by its `Chunk`, ordered the way the build
depends (foundations/spine first, "verify" cards last), with `[Must/Should/Could]`, its `Epic`, and
status. Build order across chunks is ①→②→③→④→⑤ (dependency, not calendar); within a chunk,
Must → Should → Could, verify cards last.

**Legend:** ✅ built & merged to `main` · 🟡 partly built (what's missing is noted) · ⬜ specced only
(card body written, no app code yet).

**Status:** **Chunks 1–3 are complete on `main`.** **Chunk 4 is all but done** — the rule editor,
propagation proof, and the full rule-suggestions feature (4 cards) are merged; only the manual
5-minute verify is in progress and three [Should]/[Could] cards remain. **Chunk 5 has started** on
all three strands' edges (free-tier gate, audit-integrity, self-serve setup hub).
**~33 built, 1 in progress (manual), ~14 not started, 4 new/backlog.** (Lane C's Report statuses are
now board-checked; the two Lane D onboarding remainders still carry a "confirm with Lane D" note.)

> **How this status was set:** from the commits and tests on `main` (commit hashes cited per card),
> then checked against the board's `Status` field on 2026-11-18. The 48 chunked titles and priorities
> match, and the board's **33 `Done`** cards are exactly the ✅ cards here. Four cards were moved from
> `Requirements` to `Done` on 2026-11-18 to match their merged code: the two Chunk 5 free-tier cards
> (`Define & gate the free baseline-safety tier`, `Keep free safety active behind the paywall`;
> ADR-0023), plus `Ensure audit entries can't be silently altered` (ADR-0026, PR #85) and
> `Build self-serve setup (no consultant)` (PR #84). The one 🟡 card (`Verify the 5-minute promise`)
> stays `In Progress` on the board. **Four new un-chunked Co-Pilot cards** (Epic #4, `Backlog`) were
> added 2026-11-18 — listed after the chunks, outside the chunk totals.
>
> The chunk grouping and priorities are fields on the cards. The ordering *within* each chunk is a
> synthesis from the dependency notes, not a board field.

**Database:** all four 2026-11-18 migrations are **applied** in Supabase —
`20261118000000_approval_table`, `20261118010000_run_correction_table`,
`20261118020000_task_output_edited_by`, `20261118030000_org_premium_until` (confirmed 2026-11-18 by
a read-only check of the live database). The Chunk 2/3/5 features below that depend on them have
their tables and columns in place.

---

## Chunk 1 — Doer core (Epic #3) — the spine; highest value ✅ COMPLETE

The whole Frontline-Doer governed-task experience: a Doer signs in, lands on a role-aware home, opens
`/skills`, runs a governed Skill (draft → self-critique+tone → rule-check → provenance), sees the
applicable rules in-context, and gets baseline safety even with no policy — all verified by tests.

1. ✅ `Build shared app shell + visual design pass` — [Should] — AA theme + AppShell + `app/(app)` route group
2. ✅ `Build the self-critique pass` — [Must] — the Challenger pass (ADR-0015)
3. ✅ `Add tone check to the thank-you Skill` — [Must] — per-Skill quality bar in the critique
4. ✅ `Build the "Draft a thank-you" starter Skill` — [Must] — real seeded Skill; prompt moved out of the pipeline
5. ✅ `Build the governed Skill runner` — [Must] — the `/skills` screen; no-active-policy → baseline safety (ADR-0018)
6. ✅ `Surface the applicable rule in-context` — [Should] — "Rules that apply here" panel with citations
7. ✅ `Make the home and nav role-aware (Leader vs Doer)` — [Should] — nav + home cards by `profile.role`
8. ✅ `Verify consistent reuse under current policy` — [Must] — pipeline integration tests
9. ✅ `Verify clean output passes without friction` — [Must] — pipeline integration tests (0 false positives on a sample)

## Chunk 2 — Safety net (Epic #5) — finishes Phase 1's guardrails ✅ COMPLETE

The full guardrail suite around the pipeline. PII handling runs *before* the model; risky tasks and
policy flags route to the human-approval gate. Built in three waves.

1. ✅ `Build PII detection before sending` — [Must] — `lib/domain/pii.ts`: email, phone, US SSN, Luhn-checked cards; server-side, before any Claude call (`817a914`)
2. ✅ `Strip / minimize sensitive data by default` — [Must] — redacts to placeholders before the model call *and* before storage (`817a914`)
3. ✅ `Allow deliberate keep with logged choice` — [Must] — per-category keep; logs category + actor, never the raw value (`817a914`)
4. ✅ `Build in-the-moment PII warning` — [Should] — live warning as the Doer types (`817a914`)
5. ✅ `Build the human approval / review step` — [Must] — `approval` table + `/approvals` queue + inline approve/reject on the runner result (ADR-0020, `c6014b5`)
6. ✅ `Show reviewers what they're approving (no rubber stamp)` — [Must] — approve gated behind a required acknowledgement; reject stays free (`c6014b5`)
7. ✅ `Build risk-pattern flagging` — [Must] — `lib/domain/risky-use.ts`: deterministic phrase patterns → `needs_review` with a plain reason (`0a86d23`)
8. ✅ `Tune flagging to keep false-positives low` — [Must] — routine-task sample test stays un-flagged (`0a86d23`)
9. ✅ `Reflect AI-assisted + human-reviewed on edited output` — [Must] — reviewer edit appends a new `task_output` version (`edited_by`, AI original kept); provenance recomposed (ADR-0022, `c6014b5`)
10. ✅ `Verify clean input passes without warnings` — [Must] — zero-PII false-positive sample in `pii.test.ts` + clean-input pipeline test (`817a914`)

**Decision made while building:** any org member may approve, including self-approval (MVP; one
user ≈ one org).

## Chunk 3 — Registry view (Epic #2) — consuming the record (read-side, Lane B) ✅ COMPLETE

1. ✅ `Design the usage-view empty state` — [Must] — distinct error / empty / has-activity states, reusable components (`03c57c4`, `6a971b9`)
2. ✅ `Build the usage dashboard (totals by type/staff/time)` — [Must] — totals by type and by week + safety-net summary at `/dashboard/usage` (`d1b50ec`). **"By staff" deferred:** needs an org-scoped `profile`-read RLS change (Lane A's call, only if it matters in the one-user-one-org MVP).
3. ✅ `Build per-user "my entries" transparency view` — [Should] — `/dashboard/usage/mine` (`f7d9d04`)
4. ✅ `Build entry-correction / note flow` — [Should] — append-only `run_correction` table (ADR-0021, `538d78b`)

**Also shipped (not a card):** the home dashboard's Recent-activity card now shows the Doer's real
recent runs instead of a stub (`1f8f897`).

## Chunk 4 — Living policy (Epics #1/#2/#4) — grow the policy by using it 🟢 NEARLY COMPLETE

All Musts built except the manual 5-minute verify; the whole rule-suggestions feature is merged.

1. ✅ `Build the rule viewer/editor` — [Must] — [Epic #1] — Leader edits/retires/adds rules at `/policy-seed`; publishing creates a **new policy version**, never edits in place; baseline rules **locked**; Doers get a read-only view (ADR-0024, `35e4bd0`)
2. ✅ `Verify a rule change propagates` — [Must] — [Epic #1] — `test/policy-propagation.test.ts`: real edit → publish → next-run path over an in-memory store (`9804f84`). Finding: no editor action flips a guardrail outcome on a seeded policy (data-protection is a locked baseline), so the proof is prompt grounding + baseline survival + truthful policy stamping.
3. 🟡 `Verify the 5-minute promise` — [Must] — [Epic #1] — **In progress, manual only** (the seed makes no AI call, so the time is the person's). Next: run Notion "Week 5 Manual Test Case Scenarios" → Test Case 1 with a **non-expert** (not the builder); time first-seed-question → Activate; ≤5:00 + friction notes → Done.
4. ✅ `Design rule-suggestion logic from registry` — [Should] — [Epic #1] — spec `docs/specs/epic-1-rule-suggestion-logic.md` + ADR-0025 (`c59a1ac`)
5. ✅ `Detect recurring patterns from the registry` — [Should] — [Epic #2] — pipeline logs risky-use pattern ids in the audit payload; pure counting in `lib/domain/rule-suggestions.ts` (3+ distinct runs / 30 days); reads no who-ran-it (`5b15b9b`)
6. ✅ `Surface candidate rule suggestions (dedup)` — [Should] — [Epic #2] — 7-key standards-cited catalog; a key is skipped once accepted/dismissed or already covered; fails closed. Migration `20261118050000_rule_suggestions.sql` (`suggested` origin, `policy_rule.suggestion_key`, append-only `rule_suggestion_decision`) — **applied** (`4a8c2d4`)
7. ✅ `Build "accept suggested rule" flow` — [Should] — [Epic #1] — leader-only section on `/policy-seed`; accept re-derives server-side and publishes a new version (ADR-0024); dismiss is remembered (`b65da4b`)
8. ✅ `Ship sensible expert defaults` — [Should] — [Epic #4] — **met by existing work** (reviewed 2026-11-19 against the card): every org, new included, gets the baseline safety net (ADR-0018) + the Co-Pilot's deterministic, standards-grounded engine with no setup — the "expert defaults applied with no manual setup". No build.
9. ✅ `Allow org overrides that persist` — [Should] — [Epic #4] — **met by the rule editor** (ADR-0024): a leader's rule change publishes a new version that persists + applies on the next run (`policy-propagation.test.ts`), and baseline-safety rules are locked / can't be disabled — matching both acceptance criteria exactly. No build.
10. ✅ `Export + re-import policy` — [Could] — [Epic #1] — **built** (in a PR, board → In Review): leader-only Export (downloads the active policy as portable JSON — no org/row ids) + Import from file (validates untrusted input, rejects malformed cleanly, publishes a new version via ADR-0024, baseline flags + citation provenance preserved). Pure `lib/domain/policy-export.ts`; reuses the `policy_edited` audit kind (no migration). Tests: `policy-export.test.ts` (round-trip + malformed-reject).

**Note:** baseline rules are fully **locked** in the editor — stronger than the spec's
confirm-to-override. Revisit if `Allow org overrides that persist` needs baseline overrides.

**Resolved (Lane A, risk 3) — ADR-0027:** when an active policy's rules **can't be read**,
`runGovernedSkill` no longer runs ungrounded-and-silent. The pipeline now reads via
`getPolicyRulesOrNull`, detects a read failure (active policy + null rules), still runs on baseline,
but the rule-check records a **flag with a plain disclosure** → `needs_review` via the existing
approval gate (ADR-0020), and stamps `policyUnavailable` on the audit. Chosen **Option A** (degrade +
disclose + force review) over block. No migration. Tests in `pipeline.test.ts`; `npm run verify`
green (363 tests). *(A `getActivePolicy` read failure still degrades to the ADR-0018 no-policy banner
— milder, out of scope here.)*

## Chunk 5 — Coach / Report / Onboard (Epics #6/#7/#8) — packaging; goes last

Wraps everything above. Three strands — audit/export (Epic #7), in-task coaching (Epic #6),
onboarding + free tier (Epic #8). **Cross-lane rule (Lane D, ADR-0023):** the whole safety net is
free forever; only capacity is premium, the gate sits in the Service layer, and the pipeline and
guardrails never read entitlement.

**Report (Epic #7):**

1. ⬜ `Build the audit trail from registry data` — [Must] — spec in the card; **not built** (no `/report` route yet). **← Lane C next:** read-only `lib/data` reader + pure `lib/domain` helpers + `/report` page (Leader-only), reusing `AUDIT_EVENT_TYPES`/`isAuditEventType` and showing `AUDIT_PROTECTION_STATEMENT`.
2. ✅ `Ensure audit entries can't be silently altered` — [Must] — DB stamps each audit entry's time + identity; app users may insert only known event kinds, as themselves, about their own org; TRUNCATE revoked from app roles (ADR-0026, `06b818b`/PR #85; `4f26171`/PR #83)
3. ⬜ `Build one-click responsible-AI summary export` — [Must] — spec blank. Approved: printable `/report` + browser **Print / Save as PDF** (no PDF library); Leader-only, checked server-side; CSV a later Could.
4. ⬜ `Handle low-data honestly in the summary` — [Must] — spec blank. Approved: summary **templated from data** (not model-written); empty/low-data are first-class states, never overstated.

**Coach (Epic #6):**

5. ✅ `Build in-task coaching (guide, not scold)` — [Must] — live `info`-tone nudge on the risky-use signal in the runner; pure `lib/domain/coaching.ts`, no model call
6. ✅ `Offer concrete safer alternatives in the moment` — [Must] — a per-pattern safer rewrite (or, for a safety/crisis, "bring in a person" with no AI rewrite)
7. ✅ `Apply the safer way on accept` — [Must] — "Use the safer way" rewrites the input to a safe task (tested: the rewrite no longer trips any risk pattern)
8. ✅ `Add dismiss / no-nag behavior` — [Must] — Dismiss hides a nudge and it doesn't reappear for that pattern this session
9. ✅ `Make the governed option the default low-friction path` — [Should] — **met by existing work** (reviewed 2026-11-19 against the card): the Doer's home leads with the "Run a Skill" primary CTA, the product has no ungoverned path, the runner is one low-friction screen, and coaching makes the safe option one click — satisfies both requirements + the acceptance criterion. No build.

**Onboard + free tier (Epic #8):**

10. ✅ `Build self-serve setup (no consultant)` — [Must] — `/setup` self-serve setup hub; Home routes an unfinished leader there (`1d27592`, `13ccbce`, PR #84)
11. 🟡 `Build the minutes-to-value onboarding flow` — [Must] — Lane D: time-to-first-run measurement (`a0148a8`). Lane A (2026-11-19, **uncommitted — code PR**): "Run your first Skill →" on the activated screen + a **"Use recommended answers"** fast path on the seed wizard (protective defaults: all 3 risk questions `not_sure` → every safety rule on; lands on the normal review screen — leader still clicks Activate, per Val). Tests `policy-seed-recommended.test.ts` (6). Committed (`5dc669e`). Board → **In Review** (Val, 2026-11-19); flip to Done after one live sign-up → first-run click-through — R1–R3 + R5 built; R4/AC 2–3 rest on the existing governed pipeline; **not yet clicked through end to end in a browser**.
12. ✅ `Add resume-after-interruption to onboarding` — [Must] — step-level resume on `/setup` (Lane D, `a0148a8`) + **saved-draft resume** on `/policy-seed` (Lane A, 2026-11-19): a generated-but-unactivated draft reopens at its review screen on any device, with Activate + a confirmed **Start over** (archives drafts, never deletes). AC 2 (half-finished answers before Generate, cross-device) **moved to its own card** `Save half-finished policy-seed answers server-side` [Should, MMP, Backlog] — needs a migration + ADR. Same-device answers already kept in `localStorage`. Board → **Done**.
13. ✅ `Define & gate the free baseline-safety tier` — [Must] — capability matrix (safety + oversight free, only capacity premium) + server-side capacity gate before the pipeline; free monthly run cap is a **placeholder** to tune later; billing out of scope (ADR-0023, `638d358`, `bb221a1`)
14. ✅ `Keep free safety active behind the paywall` — [Must] — regression test: safety net holds on free / capped / lapsed / paid; lapsed premium falls back to the free cap (`org.premium_until`) (`bb221a1`)
15. ⬜ `Add in-product unblock guidance` — [Must] — Feature: Self-serve setup; the board describes it as helping a stuck leader in-product without a support ticket. Not started. (The free-tier gate's "you've reached this month's free run limit" message is part of card 13, not this card.)

**Access-control fix (2026-11-19, Lane A):** the three policy-seed actions (Generate, Activate, Start over) are now **Leader-only**, checked server-side and failing closed; a Doer in an org with no policy sees a plain message instead of the wizard (baseline safety still applies, ADR-0018). Signup makes the first user a leader, so self-serve setup is unaffected.

---

## New — Co-Pilot "Not sure" handling (Epic #4, un-chunked) ⬛ BACKLOG

Added 2026-11-18 by a separate Co-Pilot session, which found the Co-Pilot treats unanswered
checkboxes as "no risk." Not yet sequenced into a chunk. **Decision so far:** every question must be
answered (choice 1 decided); choices 2–3 open. (⬛ = new card, not yet specced as app work.)

- ⬛ `Add Yes / No / Not sure answers to the Co-Pilot questions` — [Must] — [Epic #4]
- ⬛ `Treat "Not sure" as a careful but helpful answer` — [Must] — [Epic #4]
- ⬛ `Decide what "Not sure" on a banned purpose means` — [Must] — [Epic #4]
- ⬛ `Save the leader's actual answers with each assessment` — [Should] — [Epic #4]

---

## Totals

52 tickets — **41 built**, **1 in progress (manual)**, **6 specced**, **4 new/backlog**.

| Chunk | Tickets | Built | In progress | Specced | New |
| --- | --- | --- | --- | --- | --- |
| 1 — Doer core | 9 | 9 | 0 | 0 | 0 |
| 2 — Safety net | 10 | 10 | 0 | 0 | 0 |
| 3 — Registry view | 4 | 4 | 0 | 0 | 0 |
| 4 — Living policy | 10 | 9 | 1 | 0 | 0 |
| 5 — Coach / Report / Onboard | 15 | 9 | 0 | 6 | 0 |
| (un-chunked) — Co-Pilot "Not sure" | 4 | 0 | 0 | 0 | 4 |
| **Total** | **52** | **41** | **1** | **6** | **4** |

**Next in Lane C (Report / Epic #7):** apply the ADR-0026 migration in Supabase + run the check
(Val), then **build card 1** (`/report` audit trail), then spec + build cards 3 (export) and 4
(low-data honesty) together.

**ADRs added during Release 1b:**

- Chunk 1: ADR-0015 (self-critique), ADR-0018 (no-active-policy → baseline safety)
- Chunk 2: ADR-0020 (human-approval gate), ADR-0022 (reviewer edit + provenance)
- Chunk 3: ADR-0021 (entry-correction flow)
- Chunk 4: ADR-0024 (policy editing is versioned), ADR-0025 (rule suggestions from registry)
- Chunk 5: ADR-0023 (free safety net + capacity-only premium), ADR-0026 (audit insert integrity)
- Not chunk-specific: ADR-0016/0017 (Week-5 CI + self-hosted font), ADR-0019 (Node 22 toolchain)
