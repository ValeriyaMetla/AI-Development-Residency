# ADR-0031: Only an Accountable Leader can change an organization's policy, and activation happens in one protected all-or-nothing step

- **Status:** Accepted
- **Date:** 2026-11-22
- **Relates to:** ADR-0009 (policy data model), ADR-0024 (editing publishes a new version).
  Both still stand; this ADR changes who may write the policy tables and how activation runs.
  Same protected-function pattern as ADR-0028 and ADR-0030.

## Context

The Week 6 PenTest found two policy problems:

- **F-03 (P2).** Signed in as a Frontline Doer, a direct call to the Supabase Data API set an
  Org A policy's status to `active` (200, 1 row; `db/DB2b-role-escalation.txt`). The app's
  actions are Leader-only, but the database rule `policy_update_org`
  (`20261113020000_policy_seed_tables.sql`) lets any member change any of their org's policies,
  to any status.
- **F-18 (P3).** `activatePolicy` (`lib/data/policy.ts`) makes two separate writes: archive the
  current active policy, then activate the target. If the second fails (a bad ID, another org's ID
  that row-level security silently ignores, a database error), the org is left with no active
  policy, and the action can still report "activated" because it checks only for errors, not rows
  changed (`prod/prod-results.txt`, `app/ROW-S2.txt`).

Reading every rule on the policy tables for this fix found a related gap the PenTest didn't test:
members may also **insert** policies and policy rules directly, and the rule-insert check only asks
whether the policy is in the caller's org. A Frontline Doer could therefore add a rule to the org's
**active** policy through the API, and policy rule text is passed to the AI. This is our reading of
the database rules, not a tested finding.

Every legitimate policy write in the app is already Leader-only and goes through a draft first:
generating a policy, confirming it, publishing an edit (ADR-0024), publishing an import, and "start
over" (archive drafts). Members can't change their own role: `profile` has a read rule only.

Requirements: **SR-04**: only an Accountable Leader changes which policy is active, enforced by
the database as well as the app. **SR-14**: switching the active policy is all-or-nothing, and
on any failure the previous policy stays active and the user is told.

Forces in tension:

- **Enforce where the attacker can't skip it.** The public key allows direct database calls
  (threat-model crossing C7), so a Leader check in app code alone doesn't stop F-03.
- **No admin key in the app** (ADR-0028). The database must protect itself.
- **One active policy per org** is already enforced by the unique index
  `policy_one_active_per_org`, so archive and activate can't simply be swapped or run separately.
- **Keep the change small.** Group 4 (F-08: imports must keep the baseline safety rules) is planned
  separately.
- **CI is credential-free** (ADR-0016), so database behaviour can't be tested in CI today.

## Decision

**Activation and "start over" go through protected database functions that check the caller is a
leader and do the whole change in one step. Members lose direct update rights on policies, and
policies and rules can be created only by a leader, with rules added only to a draft.**

One migration:

1. **A small leader check, `public.current_user_is_leader()`**, read-only (`stable`), `security
   definer`, `set search_path = ''`: true when the caller's own profile role is
   `accountable_leader`. Like `current_org_id()`, it reads `profile` without re-triggering row-level
   security.
2. **`public.activate_policy(p_policy_id)`**, `security definer`, `set search_path = ''`, in one
   transaction:
   - refuses if there is no signed-in user (`not_signed_in`) or the caller isn't a leader
     (`not_leader`);
   - locks the target and refuses unless it's in the caller's org (`not_found`, which is the same
     answer for another org's policy, so it reveals nothing) **and** is a `draft` (`not_draft`)
     **and** has at least one rule (`no_rules`);
   - archives the org's current active policy and activates the target;
   - returns `ok`. Any error rolls back both changes, so the previous policy stays active.

   It writes no audit event, which is unchanged from today: publishing an edit or import already
   writes `policy_edited`, and generating a policy writes `policy_seeded`.
3. **`public.discard_draft_policies()`**, `security definer`, `set search_path = ''`: leader-only;
   archives the caller's org's drafts; returns `ok` or `not_leader`.
4. **Direct writes narrowed:**
   - `policy_update_org` is dropped and `update` on `policy` is revoked from `authenticated` and
     `anon`, so the two functions are the only way to change a policy's status.
   - `policy` insert: leader only, in your own org.
   - `policy_rule` insert: leader only, and only into a `draft` policy in your org, so nobody can
     append a rule to the active policy.
   - `policy_seed_response` insert: leader only (plus the existing "as yourself, in your org").
   - Read rules are unchanged: every member still sees their org's policies and rules.
5. **The app calls the functions.** `activatePolicy` and `archiveDraftPolicies` each become one
   `supabase.rpc(...)` call. Their callers (`confirmPolicy`, `discardDraftPolicy`,
   `publishEditedPolicy`, `publishImportedPolicy`) report failure for anything except `ok`, so a
   failed activation is never shown as "activated". A pure Domain helper maps each outcome to a
   plain message. The database is the enforcer; the helper only handles wording.
6. **Proof, without a database in CI.**
   - Unit tests for the outcome-to-message helper and for each caller (anything but `ok` →
     failure, never "activated").
   - A static migration test (the ADR-0028 / ADR-0030 pattern): it fails if a later migration gives
     app users `update` on `policy`, re-opens leader-free inserts, lets rules be added to a non-draft
     policy, lets logged-out users call either function, or the function loses a check.
   - A check script, `studio/supabase/checks/policy-integrity-check.sql`, run in the SQL Editor on
     studio-pentest then live, inside a rolled-back transaction. It covers:
     - a member's direct status change → refused (F-03);
     - a member calling `activate_policy` → `not_leader`;
     - a member appending a rule to the active policy → refused;
     - a leader activating a bad ID, another org's ID, or an already-archived policy → refused, with
       the old policy still active (F-18);
     - a leader activating a valid draft → `ok`, with exactly one active policy;
     - a logged-out call → refused.

## Alternatives considered

- **Database rules only (a leader-only update rule), app unchanged.** Rejected: it fixes F-03 but
  activation stays two separate writes, so F-18 remains.
- **Fix only the app (check rows changed, reorder the writes).** Rejected: it closes F-18's false
  "activated" message but not the direct-API path (F-03), and the unique one-active index means the
  writes can't be made safe from the app alone.
- **Triggers that refuse non-leader status changes.** Rejected: the two writes stay separate, and
  the rule is spread across triggers instead of one readable function (the ADR-0028 reasoning).
- **Leave the insert gap for later.** Rejected: same tables and same root cause, and a member could
  keep adding text the AI reads.
- **Also require every baseline safety rule on activation.** Deferred to group 4 (F-08), which
  owns imports keeping the safety rules; this ADR checks only that a policy has rules.

## Consequences

- **Positive:**
  - F-03 and F-18 are closed at the database level, so the app, a script and the API all meet the
    same rule.
  - Activation is all-or-nothing, so an org is never left without its policy because of a failed
    switch.
  - Members can no longer add rules to the live policy that the AI reads.
  - The same pattern as ADR-0028 and ADR-0030, so it's one way of doing protected writes across the
    app.
- **Negative (accepted):** a Frontline Doer can no longer create a draft policy directly. Nothing in
  the app lets them today, so no feature is lost, but a future "staff can suggest rules" feature
  would need its own path (rule suggestions, ADR-0025, are already leader-accepted).
- **Negative (accepted):** an archived policy can't be re-activated (`not_draft`). Restoring an old
  version would be a new feature with its own ADR (republish it as a new version, per ADR-0024).
- **Negative:** the migration must be applied before the app change merges, because the old two-write
  `activatePolicy` stops working once members lose `update` on `policy`. Pre-check before applying:
  each org has at most one active policy (the unique index already guarantees it), and a read-only
  look at which policies are in `draft`, for the record.
- **Neutral:** the migration is applied in the SQL Editor with "Run without RLS", studio-pentest
  first, then live, then the app PR is merged. Read access is unchanged.
