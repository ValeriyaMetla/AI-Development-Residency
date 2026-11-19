# Onboarding resume-after-interruption — how it works and the 1b boundary

Reference for the card *"Add resume-after-interruption to onboarding"* (Epic #8, Release 1b).

## How resume works

Resume is delivered by the `/setup` hub's **derived progress** (`lib/domain/setup.ts`), not by a
stored onboarding record. Setup progress is computed on each visit from facts that already have an
authoritative home in the database — org name (sign-up), the org's active policy, and the org's
governed-run count. Because those facts are **server-side**, a leader who leaves mid-setup returns
to the **next incomplete step on any device**, with no browser state to restore.

This satisfies four of the card's five acceptance criteria at the **step** level:

| AC | How it's met |
|---|---|
| 1 — Resume at the next incomplete step | `setupProgress().nextStep` (first step not done) |
| 3 — Cross-device | progress is a pure function of server-owned facts — no local state |
| 4 — No restart loop (completed → not re-prompted) | `shouldRouteToSetup` is false once complete |
| 5 — Progress visible (done vs remaining) | the 3-step progress bar from `setupProgress()` |

Tested in `studio/test/setup.test.ts` (`resume-after-interruption` block).

## The 1b boundary (deliberate scope cut)

**AC 2 — "partial answers preserved"** (the leader's half-finished answers *inside* the policy-seed
wizard) is **not** delivered in 1b. Today the seed wizard persists answers to `localStorage` only
(single device), and that wizard is **Lane A's** file. Saving partial answers server-side would
require editing Lane A's wizard **and** a new migration (a draft-answers store).

Decision (Val, 2026-11-18): **step-level resume is enough for Release 1b.** Server-side
partial-answer persistence is deferred as a **Lane A follow-up** (MMP candidate), not built here.

### Related gap to hand to Lane A
If a leader generates a draft policy but never **activates** it, the draft sits in the DB and the
leader lands back in an empty wizard (the `/setup` "rules" step correctly routes them to the
wizard; the wizard — Lane A — does not resume the draft). Track with the partial-answer work.
