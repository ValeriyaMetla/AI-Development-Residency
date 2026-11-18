# Release 1b — Build Outline

**Source:** Kanban board "Tasks Go Here" (Notion), filter `Release = 1b` — 48 tickets.
**Refreshed on:** 2026-11-18. **Owner view:** Val (tracking).

Every item below is the **exact card title**, grouped by its `Chunk`, ordered the way the build
depends (foundations/spine first, "verify" cards last), with `[Must/Should/Could]`, its `Epic`, and
status. Build order across chunks is ①→②→③→④→⑤ (dependency, not calendar); within a chunk,
Must → Should → Could, verify cards last.

**Legend:** ✅ built & merged to `main` · 🟡 partly built (what's missing is noted) · ⬜ specced only
(card body written, no app code yet).

**Status:** **Chunks 1–3 are complete on `main`.** Chunk 4 has started (rule editor built) and
Chunk 5 has started (free-tier gate built). **26 built, 2 partly built, 20 not started.**

> **How this status was set:** from the commits and tests on `main` (commit hashes cited per card),
> not from the board's `Status` field. The board may still show some of these cards as
> `Requirements` — move them to `Done` to match, or flag here if the board disagrees.
>
> The chunk grouping and priorities are fields on the cards. The ordering *within* each chunk is a
> synthesis from the dependency notes, not a board field.

**Before the next deploy (Val):** run the four 2026-11-18 migrations in Supabase with **"Run
without RLS"**, in timestamp order — `20261118000000_approval_table`,
`20261118010000_run_correction_table`, `20261118020000_task_output_edited_by`,
`20261118030000_org_premium_until`. The Chunk 2/3/5 features below that depend on them won't work
on Vercel until they exist in the database.

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

## Chunk 4 — Living policy (Epics #1/#2/#4) — grow the policy by using it ⬅ NEXT

1. ✅ `Build the rule viewer/editor` — [Must] — [Epic #1] — Leader edits/retires/adds rules at `/policy-seed`; publishing creates a **new policy version**, never edits in place; baseline rules **locked**; Doers get a read-only view (ADR-0024, `35e4bd0`)
2. 🟡 `Verify a rule change propagates` — [Must] — [Epic #1] — partly covered: `pipeline.test.ts` already proves "a policy change applies on the next run with no redeploy". **Missing:** a test that a version *published from the editor* is what the next run is stamped with and checked against.
3. ⬜ `Verify the 5-minute promise` — [Must] — [Epic #1]
4. ⬜ `Design rule-suggestion logic from registry` — [Should] — [Epic #1]
5. ⬜ `Detect recurring patterns from the registry` — [Should] — [Epic #2]
6. ⬜ `Surface candidate rule suggestions (dedup)` — [Should] — [Epic #2]
7. ⬜ `Build "accept suggested rule" flow` — [Should] — [Epic #1]
8. ⬜ `Ship sensible expert defaults` — [Should] — [Epic #4]
9. ⬜ `Allow org overrides that persist` — [Should] — [Epic #4]
10. ⬜ `Export + re-import policy` — [Could] — [Epic #1]

**Note:** baseline rules are fully **locked** in the editor — stronger than the spec's
confirm-to-override. Revisit if `Allow org overrides that persist` needs baseline overrides.

## Chunk 5 — Coach / Report / Onboard (Epics #6/#7/#8) — packaging; goes last

Wraps everything above. Three strands — audit/export (Epic #7), in-task coaching (Epic #6),
onboarding + free tier (Epic #8). **Cross-lane rule (Lane D, ADR-0023):** the whole safety net is
free forever; only capacity is premium, the gate sits in the Service layer, and the pipeline and
guardrails never read entitlement.

**Report (Epic #7):**

1. ⬜ `Build the audit trail from registry data` — [Must]
2. ⬜ `Ensure audit entries can't be silently altered` — [Must]
3. ⬜ `Build one-click responsible-AI summary export` — [Must]
4. ⬜ `Handle low-data honestly in the summary` — [Must]

**Coach (Epic #6):**

5. ⬜ `Build in-task coaching (guide, not scold)` — [Must]
6. ⬜ `Offer concrete safer alternatives in the moment` — [Must]
7. ⬜ `Apply the safer way on accept` — [Must]
8. ⬜ `Add dismiss / no-nag behavior` — [Must]
9. ⬜ `Make the governed option the default low-friction path` — [Should]

**Onboard + free tier (Epic #8):**

10. ⬜ `Build self-serve setup (no consultant)` — [Must]
11. ⬜ `Build the minutes-to-value onboarding flow` — [Must]
12. ⬜ `Add resume-after-interruption to onboarding` — [Must]
13. ✅ `Define & gate the free baseline-safety tier` — [Must] — capability matrix (safety + oversight free, only capacity premium) + server-side capacity gate before the pipeline; free monthly run cap is a **placeholder** to tune later; billing out of scope (ADR-0023, `638d358`, `bb221a1`)
14. ✅ `Keep free safety active behind the paywall` — [Must] — regression test: safety net holds on free / capped / lapsed / paid; lapsed premium falls back to the free cap (`org.premium_until`) (`bb221a1`)
15. 🟡 `Add in-product unblock guidance` — [Must] — partly covered: a capped-out run gets one plain message ("safety stays on — upgrade or try next month"). **Missing:** guidance for the other blocked states, and any real upgrade path.

---

## Totals

48 tickets — **26 built**, **2 partly built**, **20 specced only**.

| Chunk | Tickets | Built | Partly built | Specced |
| --- | --- | --- | --- | --- |
| 1 — Doer core | 9 | 9 | 0 | 0 |
| 2 — Safety net | 10 | 10 | 0 | 0 |
| 3 — Registry view | 4 | 4 | 0 | 0 |
| 4 — Living policy | 10 | 1 | 1 | 8 |
| 5 — Coach / Report / Onboard | 15 | 2 | 1 | 12 |
| **Total** | **48** | **26** | **2** | **20** |

**ADRs added during Release 1b:**

- Chunk 1: ADR-0015 (self-critique), ADR-0018 (no-active-policy → baseline safety)
- Chunk 2: ADR-0020 (human-approval gate), ADR-0022 (reviewer edit + provenance)
- Chunk 3: ADR-0021 (entry-correction flow)
- Chunk 4: ADR-0024 (policy editing is versioned)
- Chunk 5: ADR-0023 (free safety net + capacity-only premium)
- Not chunk-specific: ADR-0016/0017 (Week-5 CI + self-hosted font), ADR-0019 (Node 22 toolchain)
