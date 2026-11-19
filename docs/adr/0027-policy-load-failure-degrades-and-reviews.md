# ADR-0027: When an active policy's rules can't be read, a run degrades to baseline, discloses it, and is forced to human review

- **Status:** Accepted
- **Date:** 2026-11-18

> **Numbering note:** several code comments and older ADRs write "ADR-27" / "ADR-0027" to mean the
> *Build-Plan* ADR-27 ("guardrails are pure, deterministic, unit-testable functions"), a separate
> numbering scheme from this `docs/adr/00NN` sequence. This file is the repo ADR 0027 and is a
> different decision; the overlap is pre-existing and worth a later cleanup.

## Context

The governed-run pipeline reads the org's active policy fresh on every run (inheritance, ADR-0009):
`getActivePolicy` returns `Policy | null`, and the rules were read with `getPolicyRules`, which
returned `[]` on **both** a genuinely empty policy **and** a read error. So a run where an **active
policy exists but its rules fail to load** proceeded with an **ungrounded prompt** and a
**rule-check over zero rules** (which passes) — and said nothing. The Doer believes their policy is
protecting them; silently, it is not. (`getPolicyRulesOrNull`, which returns `null` only on error,
now exists and lets the pipeline tell failure from empty; the editor page was already fixed to use
it in `f6e92dd`, but the run path still swallowed the error.)

ADR-0018 already settled the neighbouring case — **no active policy** → degrade to baseline + disclose,
don't block. This ADR settles the **failure** case (risk 3). Val chose **degrade + disclose + force
review** over **block + retry**.

## Decision

**On a rules-read failure (an active policy exists, but its rules read returns `null`), the run
still proceeds on baseline safety, discloses the failure, and is forced to human review.**

1. **Still runs on baseline.** The deterministic guardrails that don't depend on the org's rules —
   PII strip, risky-use flagging, self-critique, the empty-output block — all still fire. The output
   is not unsafe, only un-checked against org-specific rules.
2. **The rule-check carries the disclosure.** When rules couldn't be read, the rule-check step —
   which is exactly the thing that couldn't be grounded — records a **`flag`** with a plain reason:
   *"We couldn't load your organization's rules, so this draft wasn't checked against them — it ran
   on baseline safety only. A person should review it before it's used."*
3. **Forced to review.** Via most-severe-wins (ADR-0014/0015) that flag sets the run to
   `needs_review`, routing it to the existing human-approval gate (ADR-0020). The output cannot be
   used until a person approves it, and they see the disclosure — so it is **no longer silent**. The
   Doer sees the same reason on the runner result.
4. **Recorded.** The completion audit payload stamps `policyUnavailable` (a fact, no sensitive
   content, ADR-0006).
5. **No migration.** This reuses the `rule_check` guardrail slot and the approval gate — no new
   table, enum, or audit-event kind.

## Alternatives considered

- **Block the run with "try again" (Option B).** Rejected: a transient read error would deny the
  tool entirely; the baseline net already protects the output, and forcing human review covers the
  "was my policy actually applied?" risk without blocking. It is also harsher than ADR-0018's stance
  for the no-policy case.
- **Proceed silently on baseline (status quo).** Rejected: the Doer believes the policy applied;
  silent non-application is a trust violation and a responsible-AI disclosure failure.
- **A dedicated `guardrail_check_type` / audit-event kind.** Rejected for this pass: it needs a
  migration plus the ADR-0026 audit allow-list change. The `rule_check` slot already represents "the
  check that couldn't be grounded," so reuse is honest and migration-free; the reason text
  disambiguates the two meanings.
- **Handle a `getActivePolicy` read failure the same way.** Out of scope here: that case currently
  degrades to the disclosed no-policy baseline path (ADR-0018). The sharp gap is the rules-read
  failure on a policy the org *has*; the `getActivePolicy`-failure case is milder and already
  disclosed.

## Consequences

- **Positive:** closes the silent-ungoverned-run gap; the human-in-the-loop promise holds even on
  failure; consistent with ADR-0018's degrade-and-disclose philosophy; no migration.
- **Negative (accepted):** a rules-read failure now forces `needs_review` even when the output would
  have been fine — a small friction on a rare error path. A `getActivePolicy` failure still degrades
  to the no-policy banner rather than this stronger path.
- **Neutral:** the `rule_check` guardrail row now has two possible meanings (a real check, or
  "couldn't be grounded"); the plain reason disambiguates, and both legitimately describe the
  rule-check's outcome for that run.
