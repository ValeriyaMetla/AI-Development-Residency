# ADR-0014: Policy rule-check is deterministic, category-driven code — not an LLM judge

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Epic 5's Release-1a piece is the **rule-check** in the governed-run pipeline: after a Skill drafts
an output, check it against the org's **active policy** and stop or flag a violation with a
plain-language reason (Epic #5, "Rule-check each task against policy"). Today `ruleCheck` is a
Phase-0 stub (blocks empty output); policy is already applied at _draft time_ by folding the rules
into the system prompt (`withPolicyContext`, ADR-0009 inheritance), but the _output_ is not yet
checked.

The hard part: policy rules are **plain-language text**, which a deterministic function cannot fully
evaluate — a true semantic check needs an LLM. But ADR-16 (Build Plan) requires guardrails to be
**code _outside_ the model**, so prompt injection (LLM01) cannot disable them, and ADR-0027 wants
guardrail logic deterministic "wherever judgment isn't irreducible." A model-based blocking check
would be exactly the thing those rules warn against.

The full PII detection + strip/minimize, risky-use flagging, and human-approval gate are **deferred
to Release 1b** (Product Release Vision & Scope); this ADR covers only the 1a rule-check.

## Decision

1. **The rule-check is a pure, deterministic, injection-proof function** (`ruleCheck(output,
activePolicyRules)` in `lib/domain/guardrails.ts`) — no model call, no I/O. It is a small
   **registry of category-keyed checks** run against the output and the active policy rules, so new
   checks plug in without touching the pipeline.
2. **Result precedence: `block` > `flag` > `pass`.** A check returns a finding or null; the engine
   returns the most severe finding, each with a plain-language reason.
3. **Initial 1a checks:**
   - **Empty output → `block`** (the safety baseline).
   - **Contact-detail pattern → `flag`** (email or a separ-ated phone number) **only when a
     `data-protection` policy rule is active** — a high-precision pattern, and a _flag_ (not block)
     so a routine output is never hard-stopped (Epic #5 "low false-positives"). The leader reviews.
4. **Semantic/plain-language-only rules are enforced at draft time** (the prompt-folding), not
   claimed by this check — the rule-check is honest about catching only the deterministically
   checkable, and `pass` never means "fully policy-compliant," only "no deterministic violation."
5. **Wired into the one governed-run pipeline** (ADR-11): the pipeline passes the loaded active
   policy rules to `ruleCheck`; the result is recorded as a `guardrail_check` (ADR-5/6) and sets the
   run status (`block` → blocked, `flag` → needs_review).

## Alternatives considered

- **LLM-as-checker (semantic judge).** Rejected as the _blocking_ guardrail: non-deterministic,
  and injection-vulnerable (a crafted input could talk the checker out of blocking) — against ADR-16.
  A bounded LLM _flag_ (never block) is a reasonable 1b/Justice-Layer addition, not the 1a floor.
- **Full PII detection now.** Deferred: the Vision & Scope puts PII detection + strip/minimize in
  1b, where it gets a proper detector + the strip/confirm-to-keep flow. A single high-precision
  contact-detail _flag_ here does not pre-empt that.
- **Attach machine-checkable conditions to every policy rule (schema change).** Rejected for 1a:
  speculative and heavy; the category-keyed registry gives extensibility without a schema change,
  and `guardrail_check.policy_rule_id` remains a reserved hook (ADR-0009) for when per-rule linkage
  is needed.

## Consequences

- **Positive:** the guardrail cannot be disabled by prompt injection (it is code outside the model);
  it is pure and fully unit-testable (ADR-0027/0028); honest about its reach; extensible (checks are
  a registry); consistent with ADR-0003 (Domain), ADR-11 (one pipeline), ADR-5/6 (logged, no
  sensitive content).
- **Negative (the point):** it will **not** catch a subtle plain-language policy violation that is
  not pattern-expressible — that ground is covered by draft-time policy guidance now and the
  self-critique pass (Epic 3) / richer 1b checks later; a `pass` is "no deterministic violation,"
  not a compliance guarantee. The contact-detail flag can still over-flag a legitimate contact
  detail — acceptable because it only _flags_ for human review, never blocks.
- **Neutral:** per-rule linkage (`guardrail_check.policy_rule_id`) and the full Epic-5 guardrails
  (PII, risky-use, human-approval) remain for 1b.
