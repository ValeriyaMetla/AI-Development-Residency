# ADR-0021: Entry correction is an additive, append-only annotation on a run — never an edit of the original record

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

The Registry view (Chunk 3, Lane B) lets a person _read_ their own governed-run record at
`/dashboard/usage/mine`. The remaining card — "Build entry-correction / note flow" — adds the one
_write_ action: a person can respond to their own record when it is wrong or needs context.

The governed-run record is **immutable by design**: `task_run`, `task_output`, `guardrail_check`,
and `audit_event` are append-only (ADR-0005 / Step-6 hardening). So a "correction" cannot mean
editing what was logged. The product question this card settles: _what a correction is, who may
make one, and how it is recorded_ — a costly-to-reverse data/product stance, so it gets an ADR.

This decision has a direct sibling shipped days earlier: the human-approval gate (ADR-0020) added
an append-only `approval` row that records an org member's decision beside a run. A correction is
the same shape — an attributable, append-only annotation beside a run — minus the status
transition. This ADR reuses that pattern deliberately.

## Decision

**A correction is a new `run_correction` row recorded alongside the run. The original record is
never edited or deleted. A correction does not change the run's status; it emits a no-content audit
event.**

1. **Additive only.** Each correction is one new `run_correction` row. No UPDATE or DELETE of any
   existing run row, ever. The immutable record stands; the correction sits beside it.
2. **Own-runs-only.** A person may annotate only a run they ran. The INSERT policy requires both
   `created_by = auth.uid()` **and** the parent `task_run.run_by = auth.uid()`. SELECT is org-scoped
   via the parent `task_run` (matching `approval_select_org`), so a correction is visible to the
   person and to their org — transparency, consistent with the `/mine` framing.
3. **No status flip.** Unlike an approval, a correction does **not** touch `task_run.status`. A
   correction is commentary, not a governance state transition; conflating it with status would
   corrupt the `needs_review` queue the approval gate consumes.
4. **Emits a no-content audit event.** `recordCorrection` _calls_ Lane A's `writeAuditEvent`
   (call-only; Lane A owns the writer) with event type `task_run_corrected` and a payload carrying
   only the non-sensitive `kind` — never the note text (ADR-0006). The correction is itself on the
   governed audit trail.
5. **Append-only at the privilege level.** Mirror `approval` / `audit_event`: no UPDATE/DELETE
   policy and `revoke update, delete`. A mistake in a note is fixed by appending another correction,
   never by rewriting one. A recorded correction is history.
6. **One `kind` discriminator.** A `correction_kind` enum — `'correction'` (the record is
   inaccurate) and `'note'` (added context) — serves the card's "entry-correction / note" with one
   table, plus a **required** plain-language `note` text (a correction with no text says nothing).
7. **Layering (Leak Test holds).** UI → server action (Service) → `lib/data/corrections.ts` writer;
   pure validation in `lib/domain/corrections.ts`. No Supabase/SDK in UI or Domain (ADR-0003).

## Alternatives considered

- **Edit the original row (true mutation).** Rejected: destroys the append-only, tamper-evident
  trail that is the entire point of the governance record.
- **Denormalize `org_id` + add a `state` lifecycle column (the prior session's plan).** Rejected:
  that plan predated the `approval` table. `approval` set the canonical sibling pattern — scope via
  the parent `task_run`, immutable, no lifecycle state. Matching it keeps RLS uniform and avoids an
  unused state machine (YAGNI).
- **Flip `task_run.status` on correction.** Rejected: a correction is not a governance decision; it
  would pollute the review queue.
- **Any org run, not just own (wider write scope).** Rejected for the MVP: own-runs-only fits the
  transparency-not-surveillance framing; widen when multi-user governance needs a Leader to annotate
  others' runs.
- **Table row only, no audit event.** Rejected: a no-content event keeps corrections on the same
  central trail as every other governed action.

## Consequences

- **Positive:** gives the data subject real recourse/contestability (responsible-AI) without ever
  mutating the immutable record; RLS + append-only posture is identical to `approval` / `audit_event`;
  the Leak Test holds.
- **Negative (accepted):** own-runs-only means a Leader cannot yet annotate someone else's run
  (named here, not silent); a user can append many notes and never edit one — acceptable, that is
  what append-only means; note text is validated for length / non-emptiness only, not moderated.
- **Neutral:** adds one table, one writer + one reader, a server action, and a row-level UI; the
  migration is additive and carries a timestamp (`20261118010000`) later than `approval`'s
  `20261118000000` — coordinate with Lane D, which also plans migrations.
