# ADR-0039: Audit events are written only through one protected database step; app users lose all direct insert, and approval events come only from the review step

- **Status:** Accepted
- **Date:** 2026-11-24
- **Supersedes in part:** ADR-0026, points 1–2 (app users may insert the audit
  event's non-stamped columns under an org-scoped insert policy). App users now have
  **no** direct insert on `audit_event` at all. The rest of ADR-0026 — append-only
  (no update/delete), the known-kind check constraint, and the id/created_at and
  insert protections on `approval` and `run_correction` — still stands.
- **Relates to:** ADR-0028 (approval events already written inside `review_task_run`),
  ADR-0030 (same `security definer` protected-step pattern). PenTest F-14 / SR-15.

## Context

The audit trail (Epic 7) is the product's proof to funders and boards that governance
actually happened. ADR-0026 locked down who, when and what-kind: an app user can no
longer set an entry's time or id, credit it to someone else, attach it to another org's
run, or invent an event kind. It deliberately left one gap open, and wrote it down as an
accepted risk: **"a member can still record a plausible entry under their own name."**

The Week 6 PenTest confirmed exactly that gap (**F-14**, P3,
`security/pentest-evidence/db/DB5-audit-forgery.txt`). Four forgery attempts were refused
(forged actor → 403, other org → 403, invented kind → 400, backdated time → 403), but one
succeeded: a signed-in user sent a plain `POST /rest/v1/audit_event` with a valid kind
(`task_approved`), credited to themselves, in their own org, with no real action behind it,
and the database returned **201 Created**. SR-15 is the requirement: *create audit events
only from the server step that performs the recorded action.*

ADR-0026 itself named the real fix — a protected write path — and logged it as a follow-up,
noting it would mean changing `writeAuditEvent` in `lib/data/runs.ts` and its callers. This
ADR is that follow-up.

What the code does today (read on `main`):

- `writeAuditEvent` does a direct `insert` into `audit_event` and is called for **11 of the
  13 event kinds**, from six files: the two pipelines (`pipeline.ts`, `copilot-pipeline.ts`),
  `corrections.ts`, `policy-seed.ts`, `policy-publish.ts`, and `rule-suggestion-decide.ts`.
- The other **two kinds — `task_approved` and `task_rejected` — are already written inside
  `review_task_run`** (ADR-0028), a `security definer` function, in the same transaction that
  records the approval. They never go through `writeAuditEvent`.

Forces in tension:

- **Enforce where the attacker can't skip it.** The public key allows direct Supabase calls
  (threat-model crossing C7), so an app-code rule alone doesn't stop F-14. It has to be a
  database privilege.
- **No admin key in the app** (ADR-0028, ADR-0030). The app acts only as the signed-in user,
  so the database can't tell a genuine pipeline write from the same user calling the API
  directly — a protected function is the only lever.
- **Keep governance logic in the Domain layer, not SQL** (ADR-0003). Most audit events are
  side-effects of multi-step Domain pipeline code, not of a single database action function.
  Moving those pipelines into the database to "write the event where the action happens"
  would be a large rewrite against our layering — out of proportion to a P3.
- **How forgeable the backing records are varies.** `approval` can't be inserted by members
  at all (ADR-0028); `guardrail_check` and `copilot_assessment` can be inserted for any run in
  the member's org; `run_correction` only for the member's own run. So "require the action's
  record to exist" is airtight for approvals but only raises the bar for the pipeline kinds.
- **Refuse vs. silently drop.** `writeAuditEvent` is best-effort today (it logs a failed write
  to the console and moves on, ADR-0026). Keeping that means a refused write is still lost
  quietly; changing it is a bigger behaviour change than F-14 needs.
- **CI is credential-free** (ADR-0016/0035), so database behaviour is proven by a static test
  plus a recorded manual check, not in CI.

## Decision

**Every audit write goes through one protected database function. App users lose all direct
insert on `audit_event`. The function stamps identity, refuses the two kinds that belong to
other protected paths, and — for the kinds that assert an outcome about a run — requires the
action's own record to already exist.**

One migration, `NNNN_audit_write_via_function.sql` (timestamp set at build time):

1. **One protected writer, `public.write_audit_event(p_task_run_id, p_event_type, p_payload)`,**
   runs with elevated rights (`security definer`, `set search_path = ''`) and, in one step:
   - refuses if there is no signed-in user, or no org (`current_org_id()`);
   - sets `actor` to the signed-in user and `org_id` to their org **itself** — the caller cannot
     choose either (closes forged actor/org at the source, not just by policy);
   - refuses an unknown `event_type` (the ADR-0026 known-kind list; the check constraint stays as
     defence in depth);
   - refuses `p_task_run_id` that is not null and not a run in the caller's org;
   - **refuses `task_approved` and `task_rejected` outright** — those are written only by
     `review_task_run`, so a direct call asking for them is always a forgery;
   - **for the outcome-claim kinds, requires the action's record to exist** for `p_task_run_id`:
     `task_completed` / `task_blocked` → a `guardrail_check` row for the run; `copilot_assessed`
     → a `copilot_assessment` row; `task_run_corrected` → a `run_correction` row for the run by
     the caller. An outcome event with nothing behind it is refused;
   - for the informational kinds (`pii_stripped`, `pii_kept`, `risky_use_flagged`, `policy_seeded`,
     `policy_edited`, `rule_suggestion_accepted`, `rule_suggestion_dismissed`) inserts the row
     as the signed-in user in their own org;
   - stamps `id` and `created_at` by default (unchanged from ADR-0026).

   `execute` is granted to `authenticated` only (revoked from `public`, `anon`).

2. **App users lose direct insert on `audit_event`.** `revoke insert on public.audit_event from
   authenticated, anon` — superseding ADR-0026's column grant and insert policy. The function,
   running as the table owner, is now the only way an app user's action reaches the table. A raw
   `POST /rest/v1/audit_event` (the F-14 vector) is refused with "permission denied".

3. **The app calls the function.** `writeAuditEvent` in `lib/data/runs.ts` becomes a single
   `supabase.rpc('write_audit_event', { p_task_run_id, p_event_type, p_payload })`. It no longer
   sends `actor` or `org_id` — the function derives both — so the six calling files are unchanged.
   The write stays best-effort (a refused write is logged, not thrown), exactly as today.

4. **Proof, without a database in CI.**
   - A static test that reads every migration and fails if any later one re-grants `insert` on
     `audit_event` to `authenticated`/`anon`, or grants `execute` on `write_audit_event` to
     `anon`/`public` (same pattern as ADR-0026/0028/0030).
   - A check script, `studio/supabase/checks/audit-write-path-check.sql`, run as a signed-in user
     inside a rolled-back transaction: a direct `insert` is refused; `write_audit_event` for
     `task_approved` is refused; for an outcome kind with no backing record is refused; for an
     informational kind succeeds; a cross-org `p_task_run_id` is refused. Val runs it on
     studio-pentest, then live. This is the F-14 re-test (BDD R11).

## Alternatives considered

- **A single generic writer, revoke direct insert, but no per-kind rules (Option 1).** Rejected
  as the decision, kept as a fallback. It passes the F-14 re-test (raw insert refused) and is the
  smallest change, but it still lets a member call the function to log a `task_approved` that
  never happened — it only moves ADR-0026's accepted gap behind a function. The extra rules in
  point 1 close the approval case completely and keep the trail consistent with the real records,
  for little more code.
- **Backing-state checks only where they are airtight (a lean Option 2).** Refuse
  `task_approved`/`task_rejected`; insert every other kind as self/own-org without a backing check.
  Honest and simpler, because the pipeline sibling tables (`guardrail_check`, `copilot_assessment`)
  are member-insertable, so their backing checks only raise the bar. Rejected as the default
  because the backing checks still buy real value — they stop *orphan* outcome events and keep the
  audit trail internally consistent with the sibling records — but this is the obvious scope to
  dial back to if the per-kind SQL proves fiddly in the build.
- **Bundle each event into its own action's database function (Option 3 / strict SR-15).** The
  cleanest reading of SR-15, and how approvals already work. Rejected for a P3: most events come
  from Domain pipeline code by design (ADR-0003), so this means re-implementing pipeline steps in
  SQL — a large change against our layering.
- **Make `writeAuditEvent` throw / fail the run on a refused write.** Rejected here: it's a
  separate behaviour change (ADR-0026 chose best-effort on purpose) and would let a logging hiccup
  break a governed run. Out of scope for F-14.

## Consequences

- **Positive:**
  - The F-14 vector is closed at the database level: no app user can insert an audit row directly;
    the API, a script and the app all meet the same rule.
  - `task_approved` / `task_rejected` can no longer be forged by any path — the writer refuses
    them, and the only path that writes them (`review_task_run`) requires a real, member-unforgeable
    approval row.
  - Outcome events can't be orphans: the trail can't carry a "completed/assessed/corrected" event
    with no corresponding record.
  - One readable function now owns every audit write, matching the approval and rate-limit patterns.
  - No pipeline logic moves into the database; the six calling files don't change.
- **Negative (accepted):** **a member can still fabricate their own run's trail.** Because
  `guardrail_check` and `copilot_assessment` are member-insertable, a determined member could insert
  a backing row for their own run and then log `task_completed` / `copilot_assessed` for it. This is
  the **same accepted residual as ADR-0028** (a member can fake only their own run, which has no
  genuine pipeline history and is visible as such). This ADR narrows the gap — cross-org, other-user,
  approval and orphan forgeries are all closed — without fully removing it. Fully closing it is
  Option 3 (pipeline-in-SQL), deferred.
- **Negative (accepted):** **a refused write is still lost silently** (console log only), unchanged
  from ADR-0026. The known-kind static test and the manual check cover the kinds in use.
- **Neutral / sequencing:** revoking direct insert breaks the old `writeAuditEvent` the instant it
  applies, so the migration and the app change must go live together (as in ADR-0028), not
  migration-first-then-app-later. Likely **one PR** (migration + function + app + static test +
  check script), applied to studio-pentest → check → live, merged right after. Final call on PR
  shape at build time.
