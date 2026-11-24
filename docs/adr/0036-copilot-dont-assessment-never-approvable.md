# ADR-0036: A Co-Pilot assessment that advises against a use can never be approved

- **Status:** Accepted
- **Date:** 2026-11-23
- **Changes:** ADR-0028's review rule, in one way only: `review_task_run` now refuses `approved`
  for a Co-Pilot "don't" assessment. Everything else in ADR-0028 stands.

## Context

The Governance Co-Pilot sends High and Prohibited assessments to Human Review
(`humanDecisionRequired`, ADR-0010). A Prohibited assessment has the verdict **"Don't use AI for
this"**: the use matches a banned purpose (manipulation, social scoring, surveillance, anything
illegal) or has no safe path. The organization's own locked policy says it won't use AI for any
legally banned purpose, citing the EU AI Act's prohibited practices (Article 5).

Until now, any reviewer could approve any flagged run, including a Prohibited one. The UX audit of
2026-11-23 also found that reviewers couldn't even see the Co-Pilot's reasons. PR #128 fixed the
screen: Co-Pilot items now show their advice and reasons, and Approve is hidden for "don't"
assessments. But a hidden button doesn't stop a direct call to the review step through the Data
API (threat-model crossing C7, ADR-0028).

Forces in tension:

- **The organization's record.** If a person can approve a banned use, the audit trail can show
  the organization approving one — the opposite of what the product is for.
- **Human judgement.** The product's rule is "AI assists, people decide". But the "don't" verdict
  isn't the AI's opinion: it comes from fixed, deterministic rules (ADR-0010). Refusing to approve
  it doesn't let the AI overrule a person; it keeps a person from overruling the organization's
  own locked safety rules.
- **Enforce where it can't be skipped.** Like ADR-0028, the rule has to live in the one protected
  database step every decision goes through.

## Decision

**A Co-Pilot assessment that advises against the use can never be approved. The only decision is
"Don't go ahead", recorded as a rejection.** Decided by Val on 2026-11-23.

1. **In the database.** Migration `20261123120000_review_refuses_dont_approval.sql` replaces
   `review_task_run` with the same signature and behavior plus one check: when the decision is
   `approved` and the run has any `copilot_assessment` with verdict `dont` (or tier `prohibited`),
   it returns the new outcome `not_approvable` and writes nothing. Rejecting is unchanged. "Any"
   assessment counts, so adding another row to the run can't undo the refusal.
2. **In the app.** Human Review doesn't offer Approve for these assessments (PR #128), and if the
   database refuses anyway the reviewer sees: "This can't be approved: the Co-Pilot advised
   against this use. Choose "Don't go ahead" to record your decision."
3. **Proved without a database in CI** by a static test (`test/review-not-approvable.test.ts`): the
   function keeps its signature, rights and grants; the new check runs before anything is written;
   nothing else in the function changed; and any later migration that redefines `review_task_run`
   must keep the check. **Live behavior** is checked by
   `supabase/checks/copilot-not-approvable-check.sql`, run by Val on studio-pentest, then live.

## Alternatives considered

- **Allow approval with an extra confirmation (a typed reason).** Rejected by Val: the record could
  still show a banned use approved.
- **Hide the button only.** Rejected: bypassable by a direct API call (ADR-0028's reason for a
  protected step).
- **Stop "don't" assessments reaching Human Review at all** (record them as rejected
  automatically). Rejected for now: a person still sees and records the decision, which keeps a
  human in the loop and leaves a clear entry in the record.

## Consequences

- **Positive:** a banned use can't be approved by anyone, through any path. The record can't show
  one. The rule sits next to the other review rules, in one place.
- **Negative (the point):**
  - **Any org member can still add a `copilot_assessment` row** (the insert rule allows org
    members, `20261114010000`). Someone could add a "don't" row to a normal Skill run to stop it
    being approved. That blocks an approval; it can't approve anything. Tightening who may insert
    assessments is a separate follow-up.
  - **There's no override.** If the deterministic rules are ever wrong, the only fix is changing
    the rules (a new version, with its own record), not approving past them.
  - CI can't run the function; the live check is manual, as with ADR-0026/0028.
- **Neutral:** the new outcome `not_approvable` joins `review_task_run`'s plain outcomes; the app
  ignores it until this migration is applied (the old function never returns it).
