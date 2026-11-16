# Release 1b — Build Outline

**Source:** Kanban board "Tasks Go Here" (Notion), filter `Release = 1b` — 48 tickets.
**Refreshed on:** 2026-11-16. **Owner view:** Val (tracking).

Every item below is the **exact card title**, grouped by its `Chunk`, ordered the way the build
depends (foundations/spine first, "verify" cards last), with `[Must/Should/Could]`, its `Epic`, and
status. Build order across chunks is ①→②→③→④→⑤ (dependency, not calendar); within a chunk,
Must → Should → Could, verify cards last.

**Legend:** ✅ built & merged to `main` · ⬜ specced only (card body written, no app code yet).

**Status:** **Chunk 1 (Doer core) is complete and merged** — the board shows those 9 cards as `Done`.
Chunks 2–5 are `Requirements` on the board (specs written, not built).

> The chunk grouping and priorities are fields on the cards. The ordering *within* each chunk is a
> synthesis from the dependency notes, not a board field.

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

## Chunk 2 — Safety net (Epic #5) — finishes Phase 1's guardrails ⬅ NEXT

The full guardrail suite around the pipeline. PII handling first (it runs *before* the model), then
the approval gate, then risky-use.

1. ⬜ `Build PII detection before sending` — [Must] — detector, server-side, before any Claude call
2. ⬜ `Strip / minimize sensitive data by default` — [Must] — acts on what detection finds
3. ⬜ `Allow deliberate keep with logged choice` — [Must] — confirm-to-keep, logged
4. ⬜ `Build in-the-moment PII warning` — [Should] — warns right as sensitive info is about to be sent
5. ⬜ `Build the human approval / review step` — [Must] — hold sensitive output before it's sent
6. ⬜ `Show reviewers what they're approving (no rubber stamp)` — [Must] — shows the content, not just a confirm button
7. ⬜ `Build risk-pattern flagging` — [Must] — flags tasks matching a risk pattern
8. ⬜ `Tune flagging to keep false-positives low` — [Must] — keeps routine tasks un-flagged
9. ⬜ `Reflect AI-assisted + human-reviewed on edited output` — [Must] — provenance label updates on human edit
10. ⬜ `Verify clean input passes without warnings` — [Must] — verification

## Chunk 3 — Registry view (Epic #2) — consuming the record (read-side, Lane B)

Only works once Chunks 1–2 produce activity. **Cross-lane note:** a "by staff" breakdown is blocked
by current RLS and would need a shared `profile`-read migration (Lane A's call, only if "by staff"
matters in the one-user-one-org MVP).

1. ⬜ `Design the usage-view empty state` — [Must] — the day-one view before any runs exist
2. ⬜ `Build the usage dashboard (totals by type/staff/time)` — [Must]
3. ⬜ `Build per-user "my entries" transparency view` — [Should]
4. ⬜ `Build entry-correction / note flow` — [Should] — the only write card; Lane B's own new table, append-only

## Chunk 4 — Living policy (Epics #1/#2/#4) — grow the policy by using it

1. ⬜ `Build the rule viewer/editor` — [Must] — [Epic #1]
2. ⬜ `Verify a rule change propagates` — [Must] — [Epic #1]
3. ⬜ `Verify the 5-minute promise` — [Must] — [Epic #1]
4. ⬜ `Design rule-suggestion logic from registry` — [Should] — [Epic #1]
5. ⬜ `Detect recurring patterns from the registry` — [Should] — [Epic #2]
6. ⬜ `Surface candidate rule suggestions (dedup)` — [Should] — [Epic #2]
7. ⬜ `Build "accept suggested rule" flow` — [Should] — [Epic #1]
8. ⬜ `Ship sensible expert defaults` — [Should] — [Epic #4]
9. ⬜ `Allow org overrides that persist` — [Should] — [Epic #4]
10. ⬜ `Export + re-import policy` — [Could] — [Epic #1]

## Chunk 5 — Coach / Report / Onboard (Epics #6/#7/#8) — packaging; goes last

Wraps everything above. Three strands — audit/export (Epic #7), in-task coaching (Epic #6),
onboarding + free tier (Epic #8). **Cross-lane note (Lane D):** the whole safety net is free forever;
tier gating sits in the Service layer and never disables a safety step.

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
13. ⬜ `Define & gate the free baseline-safety tier` — [Must]
14. ⬜ `Keep free safety active behind the paywall` — [Must]
15. ⬜ `Add in-product unblock guidance` — [Must]

---

## Totals

48 tickets — **9 built** (all of Chunk 1), 39 specced.

| Chunk | Tickets | Built | Specced |
| --- | --- | --- | --- |
| 1 — Doer core | 9 | 9 | 0 |
| 2 — Safety net | 10 | 0 | 10 |
| 3 — Registry view | 4 | 0 | 4 |
| 4 — Living policy | 10 | 0 | 10 |
| 5 — Coach / Report / Onboard | 15 | 0 | 15 |

**ADRs added during Chunk 1:** ADR-0015 (self-critique), ADR-0018 (no-active-policy → baseline
safety). (ADR-0016/0017 came from the Week-5 CI + self-hosted-font work on `main`.)
