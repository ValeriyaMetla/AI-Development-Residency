# ADR-0028: A run's review decision is made once, through one protected database step; members can no longer set a run's status directly

- **Status:** Accepted
- **Date:** 2026-11-21
- **Supersedes in part:** ADR-0020, point 3 ("A later re-review appends a new decision").
  The rest of ADR-0020, and ADR-0022's reviewer edits, still stand.

## Context

The Week 6 PenTest found two gaps in the human-approval gate (ADR-0020), the product's core promise
that a person stays accountable for flagged AI output:

- **F-01 (P1).** Signed in as a Frontline Doer, a direct call to the Supabase Data API with the
  public key changed another member's run status (PenTest evidence `db/DB2b-role-escalation.txt`).
  The status values include `approved`, so a member can take a run out of the Human Review queue
  with no approval record.
- **F-21 (P3).** Through the app's own review action, a run that was never flagged (`completed`)
  could still be approved, and a member could reject a run the leader had already approved. That
  flipped its status and left two conflicting approval rows (`ai/ROW-D3.txt`).

The cause is the same for both. A run's status changes in two different ways, but the database
treats them as one:

| Who | Change | Code |
|---|---|---|
| The pipeline, while the person's own run finishes | `running` → `completed` / `needs_review` / `blocked` | `updateTaskRunStatus` from `lib/domain/pipeline.ts` and `copilot-pipeline.ts` |
| A reviewer, in Human Review | `needs_review` → `approved` / `rejected` | `recordApproval` in `lib/data/runs.ts` |

The single database rule `task_run_update_org` (`20261112010000_rls_policies.sql`) lets any member
change any column of any run in their org, to any value. `recordApproval` also makes three
separate writes (approval row, status flip, audit event), plus a fourth for a reviewer edit
(ADR-0022). A failure partway through can leave them out of step.

Forces in tension:

- **Enforce where the attacker can't skip it.** The public key allows direct database calls
  (threat-model crossing C7), so a rule in app code alone does not stop F-01.
- **No admin key in the app.** The app acts only as the signed-in user, never with a service-role
  key (PenTest row DS2, by design). So the database cannot tell a genuine pipeline result from the
  same user calling the API directly.
- **ADR-0020 allowed re-review; SR-01 says once.** A decision that can be silently reversed is not
  a trustworthy record.
- **CI is credential-free (ADR-0016).** Database behaviour can't be tested in CI today.

## Decision

**Every review decision goes through one protected database function, which checks the run and
does the whole review in one all-or-nothing step. Members lose the ability to set a run to
`approved` or `rejected` directly, and a run can be decided only once.**

One migration, `20261121120000_review_task_run.sql`:

1. **One protected review step.** A new function,
   `public.review_task_run(p_task_run_id, p_decision, p_note, p_edited_output, p_edited_label)`,
   runs with elevated rights (`security definer`, `set search_path = ''`) and, in one transaction:
   - refuses if there is no signed-in user;
   - locks the run (`for update`) and refuses unless it is in the caller's org
     (`current_org_id()`) **and** its status is `needs_review`;
   - (approve with an edit only) inserts the reviewer's edited draft as a new `task_output` version
     with `edited_by` = the caller, keeping the AI original (ADR-0022);
   - inserts the `approval` row with `decided_by` = the caller;
   - sets the run's status to the decision;
   - writes the `task_approved` / `task_rejected` audit event, with `actor` = the caller and an
     empty payload (ADR-0006). ADR-0026's event-kind check still applies.

   It returns a plain outcome (`ok`, `not_found`, `not_pending`) rather than database error text.
   Because it runs with elevated rights, it repeats every check the normal rules would make, and
   `execute` is granted to `authenticated` only (revoked from `public` and `anon`).
2. **Members can only move their own unfinished run, and never to a review decision.**
   `task_run_update_org` is replaced by `task_run_update_own_running`:
   - it may change only a row that is in the caller's org, was **run by the caller**, and is
     currently `running`;
   - the new status must be `running`, `blocked`, `needs_review` or `completed`, never `approved`
     or `rejected`;
   - only the `status` and `updated_at` columns can change (column-level grant). Nothing in the app
     updates any other column, as checked in the code.

   The pipeline keeps working unchanged: it only moves the user's own `running` run.
3. **Once means once, even outside the app.** A unique rule on `approval (task_run_id)` allows one
   decision per run. Members lose direct `insert` on `approval`, so the function is the only way
   to record a decision.
4. **The app calls the function.** `recordApproval` becomes a single
   `supabase.rpc('review_task_run', …)` call. `submitReview` maps the outcomes to plain messages:
   `not_pending` → "This run has already been reviewed, or wasn't flagged for review." A pure
   Domain helper (`canBeReviewed(status)`) mirrors the rule, so the UI shows the buttons only on
   `needs_review` runs. **The database is the enforcer; the Domain helper is only for wording and
   display.**
5. **The first decision is final.** Reversing a decision is not supported. If it's ever needed, it
   becomes its own visible feature (for example, a leader-only override with a required reason,
   recorded as a separate event), with its own ADR. It is never a silent second approval row.
6. **Proof, without a database in CI.**
   - Unit tests for `canBeReviewed` and the outcome-to-message mapping.
   - A static test that reads the migrations and fails if any later one gives app users `update`
     on `task_run` columns other than `status` / `updated_at`, re-grants `insert` on `approval`, or
     drops the unique rule. This follows ADR-0026's pattern.
   - A check script, `studio/supabase/checks/review-integrity-check.sql`. It re-runs the F-01 and
     F-21 attacks as a signed-in user inside a transaction that is then rolled back, and expects
     each to be refused. Val runs it in the studio-pentest SQL Editor, then on live.

## Alternatives considered

- **Guard rails (triggers) on the tables, app code mostly unchanged.** A trigger refuses an
  `approved` / `rejected` status without a matching approval row, and a second approval row is
  refused. Rejected: the three or four writes stay separate, so a partial failure can still leave
  an orphan edited draft or an approval with no status change, and the rule is spread across
  triggers instead of one readable function.
- **Fix only the app's review action.** Rejected: it closes F-21 but not F-01, which goes around
  the app entirely.
- **Keep re-review (ADR-0020 point 3) and allow a later decision to append.** Rejected: a later
  reviewer could silently overturn an earlier one, which is exactly F-21. An honest reversal needs
  its own visible feature.
- **Give the server an admin (service-role) key so only trusted code writes statuses.** Rejected
  for now: it would put a key that bypasses every database rule in the app, which is a bigger risk
  than the gap it closes (see Consequences).

## Consequences

- **Positive:** F-01 and the F-21 approval gaps are closed at the database level, so a script, the
  API and the app all meet the same rule. A review is now all-or-nothing, so there is no
  half-recorded decision. "Approved" now means one person reviewed a flagged output, once. This
  also delivers part of ADR-0026's planned follow-up (a protected write path) for approval events.
- **Negative (accepted): a member can still mark their own `running` run `completed` directly and
  skip the guardrails.** The database can't tell this from the pipeline, because the pipeline runs
  as the user. It fakes only the member's own run, and that run would have no `guardrail_check`
  rows, so it shows up in the audit trail. **Follow-up, not built:** move the pipeline's final
  status change into a second protected function that requires the guardrail checks to be recorded
  first.
- **Negative (accepted): no way to correct a wrong decision yet.** A mistaken approval stands until
  an override feature exists. Corrections (ADR-0021) can still annotate the run.
- **Negative: the unique rule fails if a run already has two approval rows.** The F-21 test left
  one such run in studio-pentest (`33d17c4f…`), and live has not been checked. Before applying the
  migration, Val runs a read-only query for duplicate approvals in each project. Any duplicates are
  resolved first, by deciding which row stands, never silently.
- **Neutral:** the migration is applied in the Supabase SQL Editor with "Run without RLS"
  (studio-pentest first, then live), as with earlier RLS migrations. The app change ships in the
  same PR, because the old three-write `recordApproval` stops working once members lose direct
  `insert` on `approval`. The migration and the code must therefore go live together: apply the
  migration right before merging. Read-only access is unchanged; members still see every run and
  approval in their org.
