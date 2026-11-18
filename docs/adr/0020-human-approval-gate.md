# ADR-0020: Human-approval gate — a flagged run is cleared by an org member's recorded approve/reject decision

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

The governed-run pipeline (Lane A spine, Epic 3/5) already routes any **flagged** run to
`needs_review` — most-severe-wins across risky-use, self-critique, and the deterministic
rule-check (ADR-0014/0015). But **nothing consumes that queue.** A flagged run lands in
`needs_review` with no path to resolution: no screen to review it, no way to clear it, no record
of a human deciding. Chunk 2 Wave 3 adds the missing human-in-the-loop gate — the step that makes
"a person stays accountable" real rather than aspirational.

This card (step 1, "Build the human approval / review step") settles three open decisions:
**who may review**, **what the review action is**, and **how the decision is recorded**. The
schema already anticipated the outcome in part: `task_status` carries `approved` and `rejected`
(ADR-0003 core schema), but **no `approval` table exists** and no decision flow is wired. This is
a costly-to-reverse product/data stance (who is accountable, what the durable record is), so it
gets an ADR.

## Decision

**A flagged run is resolved by an org member's explicit approve/reject decision, recorded as its
own append-only `approval` row, which also flips the run's status and writes an audit event.**

1. **Who may review — any authenticated org member (self-approval allowed in the MVP).** Review is
   org-scoped, matching the existing RLS (`current_org_id()`); the Doer who ran a task may clear
   their own flagged run. A role gate (Leader-only) and a mandatory *distinct* second reviewer are
   deliberately **deferred** — they only become meaningful once multi-user orgs land.
2. **The action is approve/reject only — no inline edit this pass.** Editing the output and
   reflecting "AI-assisted + human-reviewed" provenance on an edit is a separate later card
   (Wave 3 card 3). This card does not touch output content.
3. **The decision is recorded in three places, each with one job:**
   - a new append-only **`approval`** row — the durable, attributable record (which run,
     `decided_by`, `approved`/`rejected`, optional plain-language `note`, timestamp);
   - **`task_run.status`** flips to `approved`/`rejected` — the current working state the queue
     filters on;
   - an **`audit_event`** (`task_approved` / `task_rejected`) — the event-log entry, payload
     carrying no sensitive content (ADR-0006).
   The approval row is **append-only** (no UPDATE/DELETE at the RLS *and* privilege level), the
   same tamper-evident posture as `audit_event` (ADR-0005 / Step-6 append-only hardening): a
   governance decision, once made, is history. A later re-review appends a new decision; it never
   rewrites the old one.
4. **Two entry points, one server path.** A `/approvals` queue (the pending `needs_review` runs)
   and an inline approve/reject on the runner result both call the **same Service action**, which
   delegates to a single Data-Source writer. No governance logic in the UI — the Leak Test holds
   (ADR-0003).

## Alternatives considered

- **Status flip only, no `approval` table.** Rejected: a bare `approved`/`rejected` enum can't
  answer *who* decided, *when*, or *why* — which is the entire point of an accountable-human gate.
  The attributable record is the deliverable, not a side effect.
- **Leader-only approval in the MVP.** Rejected now: with one-user-one-org, a Doer could never
  clear their own flagged run, so the queue would dead-end and kill time-to-value. Revisit when
  multi-user arrives — that is precisely when a distinct-reviewer gate earns its cost.
- **Mutable approval (let a decision be changed in place).** Rejected: a decision is a historical
  fact. Re-review appends a new decision row; rewriting the old one would break the trail the gate
  exists to create.
- **Make approval an `audit_event` with no dedicated table.** Rejected: the audit log is a flat
  event stream; a first-class `approval` row gives the decision a typed shape, a foreign key, and
  its own RLS surface, while the audit event still records that the event happened.

## Consequences

- **Positive:** the `needs_review` queue the spine already fills now has a consumer and a
  resolution path; every decision is attributable and tamper-evident; the posture is consistent
  with the append-only audit log; no change to the spine's flagging logic is needed.
- **Negative (accepted):** self-approval is not a true second set of eyes — the MVP trusts the
  same person to stop and decide. The reviewer UI (Wave 3 card 2, "no rubber stamp") must make the
  decision *deliberate* rather than relying on a separate reviewer; a mandatory distinct reviewer
  is a later card and is named here so the gap is explicit, not silent.
- **Neutral:** `task_status` already held `approved`/`rejected`, so this ADR adds the `approval`
  table and the decision flow, not the status values. Migrations stay additive (ADR-0003); the new
  migration carries a later timestamp than any in-flight lane migration to avoid filename clashes.
