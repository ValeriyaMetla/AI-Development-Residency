# ADR-0023: Free = full safety net + oversight tools; premium = capacity only; no plan state can disable a safety step

- **Status:** Accepted
- **Date:** 2026-11-18

## Context

The product exists so small nonprofits — little budget, no technical staff — can use AI safely
and fairly. Epic 8 (Lane D) must draw the line between what is **free forever** and what is
**paid**, and guarantee that line can never put safety behind money.

There is a cost reality behind the decision: every governed run makes several Claude API calls
(policy grounding, draft, self-critique, rule-check), and today the **platform pays Anthropic**
for them. A free tier therefore has a real marginal cost, which is the *only* reason a usage cap
exists — to bound that cost, not to nudge the core audience toward paying.

Val locked the offering cut, and in discussion we added a forward-compatibility decision: a future
**"bring your own Claude" (BYOK)** lane, where an org supplies its own API key and pays Anthropic
directly, would make higher/unlimited runs possible at near-zero cost to the platform — a pure
*capacity* lever that fits the invariant perfectly. BYOK is **not built this release** (the audience
is largely non-technical, and billing / key-management is out of scope), but the data model should
not foreclose it. This decision shapes pricing, the data model, and the safety guarantee — costly
to reverse — so it is recorded here.

## Decision

1. **The free tier includes the entire safety net, forever, for every org, with no payment and no
   expiry:** the governed-run pipeline on every run (policy grounding, self-critique, deterministic
   rule-check / guardrails), provenance labels, PII detection + strip/minimize with confirm-to-keep,
   the human-approval gate, and per-run audit logging. None is ever a paid upgrade.

2. **The free tier also includes the oversight and growth tools:** usage dashboard (Epic 2),
   living-policy suggestions / editable rules (Epic 1), and responsible-AI / audit export (Epic 7).
   Seeing, improving, and proving your AI use is free regardless of budget.

3. **Premium is scoped to capacity only:** run volume beyond a generous monthly soft cap, additional
   Skills beyond the starter set, and additional staff seats. Nothing else.

4. **Hard invariant — caps degrade capacity, never protection.** A cap only reduces *how much* a free
   org can do. Reaching the cap **blocks the run before any output** (or routes to upgrade) — it never
   produces an unsafe run. No cap, plan state, feature flag, or org configuration can disable,
   downgrade, or bypass any safety step. This invariant is enforced by an **automated regression test**
   across free / capped-out / lapsed / paid states, wired into the build gate (built in the "Keep free
   safety active behind the paywall" ticket).

5. **Entitlement is server-side and default-deny.** Plan and usage are resolved on the server; a
   client-supplied plan or "skip-safety" flag is never trusted. Absent or unknown entitlement denies
   *premium* but still grants *baseline safety*.

6. **"Who pays for model usage" is modeled as a first-class org attribute** (the *cost-payer*), with
   exactly one value this release: **platform-pays.** Bring-your-own-Claude (org-pays, via the org's
   own API key) is a **deferred capacity lane** — designed-for, not built. Adding it later is additive
   (a new attribute value + a secure key store), not a migration rewrite.

7. **A lapsed paid org falls back to the free cap with safety intact** — it is treated as a free org,
   never left unsafe.

8. **The cap figure is a named "generous, tune-later" placeholder constant.** The real number (and
   whether seats / Skills are also capped on free) is set with real per-run cost data when billing is
   turned on — both out of scope for this release. This ADR fixes only that *a generous cap exists and
   degrades capacity only.*

## Alternatives considered

- **Put some safety (or the oversight tools) behind premium.** Rejected — the orgs least able to pay
  would run AI unprotected and blind, the exact harm the product exists to prevent.
- **Hardcode "platform always pays."** Rejected — it forecloses the BYOK lane and would force a
  data-model rewrite later; modeling a cost-payer attribute now costs almost nothing and keeps the
  option open (YAGNI-honest: build one case, don't foreclose the second).
- **Build BYOK now.** Rejected — the core audience is non-technical (an API key is not their path to
  value), and key-management + billing are out of scope for MVP #1; it is a future lane, not this
  release's work.
- **Lock a specific cap number now.** Rejected — needs real API cost data; a placeholder constant lets
  the build proceed correctly without it.
- **Block runs when no policy / treat a cap like a safety stop.** Out of scope here; the no-policy
  stance is ADR-0018, and a cap is a *capacity* stop that happens *before* output, not a safety
  mechanism.

## Consequences

- **Positive:** the equity promise holds in code — safe and able to grow from day one without a credit
  card; the invariant is testable, not a convention; BYOK stays open as a mission-friendly future
  upgrade without any rewrite; lapsed orgs stay safe.
- **Negative (accepted):** carrying the model cost of free orgs is a real (bounded) expense until
  billing / BYOK exist; modeling a cost-payer attribute with only one value today is a small amount of
  now-unused structure, justified by keeping BYOK additive.
- **Neutral:** this ADR sets the policy and the data-model stance; the enforcement, the migration, and
  the regression test are built in the "Keep free safety active behind the paywall" ticket (Phase 1).
  It changes no existing guardrail and does not touch `pipeline.ts` / `guardrails.ts`.
