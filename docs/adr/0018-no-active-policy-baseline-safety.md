# ADR-0018: With no active policy, a governed run proceeds on baseline safety (it does not block)

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The governed Skill runner (Epic 3, Release 1b) lets a Frontline Doer run an everyday task as a
governed Skill. Policy inheritance (Epic 1, ADR-0009) folds the org's **active** policy into every
run. But an org may have **no active policy yet** — a Doer can reach the runner before the
Accountable Leader has completed the ~5-minute policy seed.

The "Build the governed Skill runner" card left this as an open decision: when there is no active
policy, should a run **proceed on baseline safety**, or **block with guidance** to set a policy
first? Val decided: **proceed on baseline safety.** This ADR records that and why, because it is a
costly-to-reverse product/safety stance.

## Decision

**With no active policy, the run proceeds — it is never blocked solely for lack of a policy —
because the baseline safety net still applies, and the absence is disclosed.**

1. The governed-run pipeline already degrades safely: `getActivePolicy` returns null →
   `policyRules = []` → `withPolicyContext` leaves the prompt ungrounded-but-intact, and the run
   still passes through the **deterministic rule-check** (empty-output block, ADR-0014), the
   **self-critique Challenger** (ADR-0015), and the **provenance label**. So "no policy" is not
   "no safety."
2. The runner **discloses** the state: when no policy is active it shows a plain banner — "No active
   policy yet — running on baseline safety. Ask your admin to set your rules for fuller protection."
   — with a link to the policy seed. Disclosure, not a wall.
3. Blocking is reserved for an actual safety stop (an empty/failed draft, a rule-check block, a
   self-critique block), never for the mere absence of a policy.

## Alternatives considered

- **Block with guidance until a policy exists.** Rejected: it makes the tool dead weight for exactly
  the orgs that have not set up yet, kills time-to-value, and contradicts the product promise ("a
  safety net even before you've set your rules"). The deterministic guardrails make an ungoverned
  run genuinely safe enough to allow, so a hard block is unjustified harm-prevention theater.
- **Proceed silently (no banner).** Rejected: honest disclosure is a responsible-AI requirement; the
  user should know the output was not checked against org-specific rules.

## Consequences

- **Positive:** immediate value for un-set-up orgs; consistent with the pipeline's existing
  fail-safe behavior and with the Co-Pilot (which only fails closed when the *standards floor* is
  missing, not when a policy is absent); the free baseline-safety tier (Lane D) stays meaningful.
- **Negative (accepted):** output in a no-policy run is checked only against the baseline guardrails,
  not org-specific plain-language rules — the banner makes this explicit, and the human stays the
  final approver (Chunk 2 approval gate).
- **Neutral:** when a policy is later activated, the next run inherits it automatically (ADR-0009),
  no redeploy. This ADR changes no data model and no guardrail; it records a UI + product stance.
