# ADR-0022: A reviewer may edit a flagged draft; edits append a new output version and provenance reflects human involvement

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

ADR-0020 shipped the human-approval gate with a deliberate limit: **"approve/reject only — no
inline edit this pass."** Chunk 2 Wave 3 card 3 ("Reflect AI-assisted + human-reviewed on edited
output") needs the reviewer to be able to **edit** a flagged draft and have the output's
**provenance** honestly reflect that a human was involved. Offered the choice between reflecting
human-review provenance without editing versus introducing editing, Val chose **to introduce
editing now.**

That is a costly-to-reverse change: it reopens a decision ADR-0020 closed, and it touches the data
model (`task_output` is otherwise insert-only). So it gets its own ADR. This ADR **supersedes only
the "no inline edit this pass" sub-decision of ADR-0020** — the gate itself, the append-only
`approval` record, and "any org member approves (self-approval MVP)" all stand.

## Decision

**A reviewer may edit a flagged draft before approving; an edit is saved as a new output version,
and provenance is composed from the run's state rather than by rewriting stored labels.**

1. **Editing happens inside the review step.** While reviewing a flagged run (in the `/approvals`
   queue or inline on the runner result), the reviewer may change the draft text, then approve.
   Rejecting needs no edit. Editing an output that no one is approving is out of scope.
2. **An edit appends a new `task_output` row — never an in-place overwrite.** The AI's original
   output row is preserved; the human-edited version is a new row on the same run. `task_output`
   gains a nullable **`edited_by`** column (null = the AI's original draft; set = the person who
   edited). The **current** output for a run is its most recent row. This keeps the honest record —
   what the AI produced *and* what the human changed it to — and preserves the table's append-only
   posture (still no UPDATE/DELETE).
3. **Provenance is composed at display time, in one Domain function, from `(status, edited_by)` —
   not by mutating stored labels.** Approved + edited → *"AI-assisted — edited and approved by a
   person"*; approved, not edited → *"AI-generated with Claude (Sonnet) — reviewed by a person"*;
   otherwise the plain AI label. The stored `provenance_label` stays the AI base on every row, so
   the human-involvement wording has a single source of truth, and Lane C's responsible-AI export
   composes the same label from the same facts.
4. **The edited text is untrusted input.** It is validated (non-empty, length-capped) in the Domain
   parser before any write; the new row is RLS-scoped to the caller's org and authored by the caller
   (`edited_by = auth.uid()`), via a tightened `task_output` insert policy.

## Alternatives considered

- **Overwrite `task_output` in place.** Rejected: it destroys the AI's original output, so you could
  no longer show or audit what the AI produced versus what the human changed — which is the whole
  point of provenance — and it breaks the table's append-only posture.
- **Store the composed human-reviewed label in `provenance_label` at decision time.** Rejected:
  it duplicates the human-involvement wording across rows and invites drift. Deriving it from
  `(status, edited_by)` keeps one source of truth and lets an approved-but-unedited run read
  "reviewed by a person" with no extra row.
- **Keep "no edit" (reflect human-review provenance only).** Considered and offered to Val; she
  chose to introduce editing, so a reviewer can fix a draft instead of only rejecting it.

## Consequences

- **Positive:** honest, queryable provenance (who edited, with the AI original retained); the
  append-only posture is preserved; reviewers get a middle path between rubber-stamping and
  rejecting.
- **Negative (accepted):** a run can now have more than one `task_output` row, so every reader must
  select the latest as current (a small, explicit rule). Self-approval still applies (ADR-0020), so
  the same person may edit and approve — the no-rubber-stamp acknowledgement (card 2) is the
  counter-pressure; a distinct reviewer remains a later card.
- **Neutral:** supersedes only ADR-0020's "no inline edit this pass" sub-scope. The migration is
  additive (a nullable column + a tightened insert policy), timestamped after the Wave 3 approval
  migration.
