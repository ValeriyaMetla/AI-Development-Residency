# ADR-0042: The Studio never uses AI to score, rank, or predict outcomes about people

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The responsible-AI "third rail" is building AI that **judges a person** — scoring eligibility or
risk, predicting who is likely to succeed, or ranking who deserves help. The EU AI Act names social
scoring a prohibited practice (Article 5); NIST, OECD, and UNESCO all reserve determinations about
people for humans. The 59-standard Responsible-AI Standards Library review surfaced this (FEN-005)
as the single highest-value guardrail to make explicit.

The promise is already **enforced** in three separate places, but recorded as a *decision* in none:

- **Policy layer.** `q7-prohibit-scoring-people` is a non-overridable baseline-safety rule in every
  generated policy ("We won't use AI to score, rank, or judge people…", `policy-seed-spec.ts`).
- **Co-Pilot.** A use matching social scoring lands in the Prohibited tier → the "Don't use AI for
  this" verdict (ADR-0010), from fixed deterministic rules.
- **Review.** A "don't" assessment can never be approved (ADR-0036).

Because the stance lives implicitly across three enforcement points, a future session could add a
feature that crosses it — a referral-prioritization ranker, a "likelihood to succeed" score to
triage clients — without noticing it contradicts a deliberate product promise. ADRs exist precisely
so that doesn't happen.

## Decision

**The Studio will never build AI that scores, ranks, or predicts outcomes about a person** —
eligibility, risk, deservingness, likelihood to succeed, or prioritization of who receives help.
AI stays on the *work* (drafting, summarizing, organizing, researching); people decide about people.
(Decided by Val on 2026-11-25.)

1. **A dedicated, precisely-cited catalog row.** A new `standard_rule` — `euaiact-no-scoring`,
   citing EU AI Act Article 5 (prohibited practices) — so the non-overridable policy baseline cites
   *this* rule instead of the generic `euaiact-match-risk`. (Written in the Step-2 migration.)
2. **The existing enforcement stands and is named here as the single record:** the policy baseline
   (`q7-prohibit-scoring-people`), the Co-Pilot Prohibited tier (ADR-0010), and the review refusal
   (ADR-0036) together enforce this; this ADR is where the *why* lives.
3. **It is a build-time product constraint, not a runtime toggle.** No plan, policy edit, or
   configuration can turn person-scoring on — consistent with the never-disable invariant (ADR-0023).

## Alternatives considered

- **Leave it implicit across the three enforcement points.** Rejected: no single place says "don't
  build this", so a future prioritization or triage feature could cross the line unnoticed — the
  exact failure ADRs prevent.
- **Fold it into ADR-0036.** Rejected: ADR-0036 is a narrow *review* rule ("a 'don't' can't be
  approved"). This is the affirmative *product* promise and belongs on its own.
- **Offer opt-in person-scoring to orgs that ask for it.** Rejected: it is an EU AI Act prohibited
  practice and the responsible-AI third rail; shipping it would contradict the product's purpose
  (governing AI *for* the people an org serves).

## Consequences

- **Positive:** one record a future session reads before building anything that ranks people; a
  precise citation for the policy baseline; the promise is demonstrable to funders and partners.
- **Negative (the point):** the Studio cannot offer legitimately-useful prioritization aids (triage
  suggestions, "who to call first") even when an org asks — those stay fully human-decided, and we
  accept that scope cut. The boundary between *organizing information* (sorting a list is fine) and
  *judging a person* (scoring who deserves help is not) takes judgement on future features; this ADR
  sets the principle, not every edge.
- **Neutral:** no code change beyond the dedicated `standard_rule` row; the three enforcement points
  already exist, so this ADR mostly *records* a stance rather than changing behavior.
