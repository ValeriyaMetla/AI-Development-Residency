# ADR-0043: Refine ADR-0042 — AI must not make the determination about a person, but may support human-governed prioritization

- **Status:** Accepted
- **Date:** 2026-11-25
- **Refines:** ADR-0042 (narrows the prohibition's scope; ADR-0042 otherwise stands)

## Context

ADR-0042 set a blanket promise: the Studio never uses AI to score, rank, or predict outcomes about
people. In practice that is too rigid for community support. A nonprofit legitimately needs to
prioritize scarce resources (who to call first for the last shelter bed), and a flat ban blocks AI
even from *organizing* that information for a person to decide. The Standards Library draft itself
permits this (FEN-005 "Fair Resource Prioritization" — allowed under a human-approved policy).

"Follow the EU AI Act" is not the same as "allow person-scoring." The Act pairs two things:

- **Article 5** — a *narrow* ban on **social scoring** (the Commission is explicit it is "not a
  general ban on scoring people"), with
- **Article 14** — mandatory **human oversight** for the high-risk person-scoring it permits.

So aligning with the Act means: no social scoring, and a human stays in control of any determination
about a person — not a blanket ban.

## Decision (Val, 2026-11-25)

Refine ADR-0042's prohibition to the real line:

- **Prohibited:** AI **makes or predicts the determination about a person** — who is eligible, at
  risk, deserving, or likely to succeed, or who receives help. Social scoring (Art. 5) stays fully
  prohibited.
- **Permitted:** AI may **organize information and apply the organization's own written
  prioritization rules to support a person**, provided a **named human makes the determination**
  (Art. 14 human oversight). AI on the work and on organizing; the human judges the person.

Everything else in ADR-0042 stands (its enforcement points and the build-time constraint). This
changes only the *scope* of what is prohibited.

## This already fits the architecture

The Co-Pilot's `judgesPerson` signal already encodes this line: it flags a use where AI would judge
a person (High tier), and its mitigation — "restructure so the AI only does the work and a person
makes the judgment" — **neutralizes** the signal. A human-governed prioritization that keeps the
human deciding therefore already clears the Co-Pilot. **No engine change is needed**; only the
wording of the rule is refined. (This is a good sign the refined line was the right one.)

## Changes

- `standard_rule` row `euaiact-no-scoring`: `rule_text` and `citation` updated (Art. 5 + Art. 14).
  Migration `20261125130000_refine_no_scoring_rule.sql` (an `UPDATE` of the existing row).
- Policy baseline `q7-prohibit-scoring-people`: reworded to the refined line (`policy-seed-spec.ts`).
- The Co-Pilot `judgesPerson` reason wording follows for consistency; its logic is unchanged.

## Alternatives considered

- **Keep the blanket ban (ADR-0042 as-is).** Rejected by Val: too rigid; blocks legitimate
  human-run prioritization.
- **Drop to Article 5's narrow letter only.** Rejected: that would permit AI to risk- or
  eligibility-score people as long as it is not "social scoring" — the responsible-AI third rail,
  and exactly the harm to the vulnerable people these organizations serve. Under-protective.

## Consequences

- **Positive:** flexible enough for real resource-navigation work, still protects against AI judging
  people; aligned with the Act's actual structure (Art. 5 + Art. 14).
- **Negative (the point):** there is now a judgment line between "supporting a human-run
  prioritization" (allowed) and "AI making the determination" (prohibited). Future features must be
  read against it; the Co-Pilot's `judgesPerson` flag plus its human-review mitigation is the
  enforcement that keeps the human deciding.
- **Neutral:** ADR-0042 stays Accepted, annotated "Refined by ADR-0043." The catalog-row update is a
  content refresh — no hard deploy-ordering constraint this time, because the policy wording comes
  from the spec (not the DB row) and the Co-Pilot uses the row's *citation*, which only displays.
