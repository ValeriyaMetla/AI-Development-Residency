---
name: mvp-scoping
description: Scope the minimum to learn, then stage the product into releases and express each as a vision-and-scope deliverable. Covers: name the riskiest assumption; capture needs as user stories with Given-When-Then acceptance criteria; cut to the minimum with MoSCoW; split the offering into MVP vs MMP (minimum viable vs minimum marketable product); prioritize problems by Risk×Certainty and Effort×Value; build a vision board per audience per release (vision statement, problems, goals, value, unique value proposition, barriers with mitigations, costs, KPIs, use cases); and write a per-release scope-of-outcomes table (value → problem → outcomes). Use when planning a product, defining an MVP or MVP-vs-MMP, deciding what to build or cut, writing user stories, prioritizing work with MoSCoW, or producing a release vision, vision board, release roadmap, or scope-of-outcomes table — even if the user doesn't say "skill." Keeps every release claim matched to what that release builds; splits leading (pre-launch) vs lagging (post-launch) KPIs. Defers the full PRD to product-specs, the how to technical-planning, and the epic/feature/task breakdown + backlog structure to backlog-decomposition.
metadata:
  version: 2.0
---

# MVP, Release Vision & Scope

## Intent

Scope the minimum needed to *learn*, then stage the offering into releases and express each as a vision + scope deliverable — so the first version ships fast and produces real learning, and the roadmap is honest about what ships when. Combines the Lean Startup (MVP = validated learning), MoSCoW prioritization, and the Tech Fleet "Product Vision, Scope, and Roadmap" workshop. Consults [[audience-segmentation]] (who + problems) and [[problem-framing]] (roots); its stories and scope feed [[product-specs]] (the PRD), [[technical-planning]] (the how), and [[backlog-decomposition]] (epics → features → tasks → backlog).

## Start with the assumption, not the features

1. **Name the riskiest assumption first.** State the one belief that must be true for the product to work. You scope to test *that*.
2. **Define the learning goal.** Decide what evidence would prove or disprove it. Success = *learning per effort*, not features shipped.
3. **Consider testing without building.** A landing page, concierge (do it manually), or Wizard-of-Oz test may validate the assumption faster than code. Don't build what a cheaper test could answer.

## Capture needs as user stories

4. **User stories:** "As a [user], I want [goal], so that [benefit]" — user value, not implementation.
5. **Testable acceptance criteria** in Given-When-Then; specific and measurable (avoid "fast"/"easy"); cover the main path and obvious error cases.

## Cut to the minimum, then stage into releases

6. **MoSCoW every story** (Must / Should / Could / Won't). **The MVP is the Musts only** — scoping is mostly subtraction; when in doubt, cut it (default to Won't for this release).
7. **Split the offering into releases.** **MVP** = the smallest release that *validates the riskiest assumption* ("problems to solve and validate first"). **MMP** (minimum marketable product) = the minimum *sellable/adoptable* release ("all problems, solved at market"). Offer the full roadmap; ship release by release.
8. **Prioritize problems with two lenses.** **Risk × Certainty** (high-risk + low-certainty = *validate first*) decides what lands in MVP vs MMP. **Effort × Value** (low-effort + high-value = *quick win*) sequences work within a release. Prioritization is a judgment call — override a matrix when you have a stated reason.

## Build the release vision & scope deliverable (per audience, per release)

9. **Vision board per audience per release:** vision statement (one-sentence elevator pitch), audience, problems, business goals, value-per-problem, unique value proposition, barriers, costs, KPIs, use cases. MVP board = the near-term (validate-first) problems; MMP board = all problems.
10. **Keep every release claim matched to what that release actually builds.** Never list a value, UVP, or use case the release won't deliver; a differentiator that ships later belongs on the *later* release's board, not the MVP's.
11. **Value maps 1:1 to problems; scope maps to value.** Each value answers a specific problem; each scope-of-outcomes row traces to a value item. **Barriers come with mitigations; costs cover time, money, and energy** — not just money.
12. **KPIs: leading before lagging.** **Pre-launch / validated-learning (leading)** KPIs measure now — problem validation, desirability/concept-test, build quality. **Post-launch North Star + AARRR (lagging)** KPIs measure once live. Give each a measurement method and a counter-metric where it's gameable; don't use a usage North Star before there are users — use a leading proxy. Ignore vanity metrics (signups with no engagement).
13. **Write a scope-of-outcomes table per release:** Value → Associated Problem → Outcomes ("We will [value] by: (1)…(2)…(3)…"), outcome-level, no implementation. This table is the **hand-off point to [[backlog-decomposition]]** (epics → features → tasks → backlog).

## Build, measure, learn

14. **Ship the smallest Must-have set, then measure real behavior** — what users *do*, not what they say.
15. **Decide pivot or persevere** on the evidence. Hand the epic/feature/task breakdown and the backlog to [[backlog-decomposition]].

## Checklist before calling the scope "done"

- [ ] The riskiest assumption is written down, and what evidence proves/disproves it
- [ ] A cheaper non-code test was considered first
- [ ] Needs are user stories with Given-When-Then acceptance criteria (main path + errors)
- [ ] Every story is MoSCoW-tagged; the MVP contains only Musts
- [ ] Releases split: MVP (validate-first) vs MMP (all problems, at market)
- [ ] Problems prioritized — Risk×Certainty for the split, Effort×Value for sequencing; any override justified
- [ ] A vision board per audience per release, every field filled
- [ ] Every release claim (value / UVP / use case) matches what that release builds
- [ ] Value 1:1 to problems; each scope row traces to a value item; barriers have mitigations; costs cover time/money/energy
- [ ] KPIs split leading (pre-launch) vs lagging (post-launch), each with a method; counter-metric where gameable
- [ ] A scope-of-outcomes table per release (Value → Problem → Outcomes), outcome-level
- [ ] Assumptions flagged; epic/feature/task breakdown + backlog handed to backlog-decomposition

## When unsure

If the feature list keeps growing, you've lost the assumption — return to rule 1. When a story's priority is debated, default to Won't for this release. If you can't tell whether a problem is MVP or MMP, put it in MMP (default to the smaller MVP). If a release claims a value it won't build, move the claim to the release that builds it. If a KPI needs live users, it's lagging — park it as post-launch and find a leading proxy. Hand the audiences/problems to [[audience-segmentation]], root-cause digging to [[problem-framing]], the full PRD to [[product-specs]], how-to-build to [[technical-planning]], and the epic/feature/task breakdown + backlog to [[backlog-decomposition]].

## Based on

- The Lean Startup (Eric Ries) — MVP and the Build-Measure-Learn loop; validated learning; leading/lagging and vanity-vs-actionable metrics.
- User stories and acceptance criteria (Agile / Mike Cohn), Given-When-Then.
- MoSCoW prioritization (DSDM) — Must / Should / Could / Won't.
- Tech Fleet — "Product Vision, Scope, and Roadmap" workshop (vision boards per audience per release; MVP "validate first" vs MMP "solve at market"; Risk×Certainty and Effort×Value priority matrices; scope of outcomes; the "0 → Backlog" flow).

## Examples

**Release claim — ❌ overclaims vs ✅ matches scope**
- ❌ MVP competitive advantage: "the co-designed Justice Layer" *(when that ships at MMP)*
- ✅ MVP competitive advantage: "governance built in; you own your rules" *(what the MVP builds); the Justice Layer is claimed on the MMP board*

**KPI — ❌ lagging-too-early vs ✅ leading proxy**
- ❌ MVP KPI: "% of orgs that reuse a governed task" *(needs live users — can't measure pre-launch)*
- ✅ MVP KPI: "% of concept-testers who'd complete the seed AND reuse a task" *(a leading proxy measurable now)*

**MVP vs MMP split — ❌ everything vs ✅ validate-first**
- ❌ Put all problems in the MVP *(that's the full product, not a validation release)*
- ✅ MVP = the few problems that test the riskiest assumption; MMP = all problems at market
