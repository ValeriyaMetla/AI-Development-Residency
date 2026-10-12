---
name: mvp-scoping
description: Enforces disciplined MVP scoping — naming the core assumption to test, capturing needs as user stories, and cutting to the minimum with MoSCoW prioritization — so the first version ships fast and produces real learning. Use when planning a product, defining an MVP, deciding what features to build or cut, writing user stories, or prioritizing a backlog.
---

# MVP / Product Scoping

An MVP is the fastest way to learn whether an idea works with the least effort — not a shrunken version of the final product. Scope around the learning you need, ship it, then decide whether to pivot or persevere. This skill follows the Lean Startup, user stories, and MoSCoW prioritization.

## Start with the assumption, not the features

1. **Name the riskiest assumption first.** Before listing features, state the one belief that must be true for this product to work (e.g. "people will pay to solve X"). You scope the MVP to test *that*.
2. **Define the learning goal.** Decide what evidence would prove or disprove the assumption. The success metric is *learning per effort*, not features shipped.
3. **Consider testing without building.** A landing page, concierge (do it manually), or Wizard-of-Oz test may validate the assumption faster than code. Don't build what a cheaper test could answer.

## Capture needs as user stories

4. **Write stories in the standard form:** "As a [type of user], I want [goal], so that [benefit]." This keeps focus on user value, not implementation.
5. **Add testable acceptance criteria.** Use Given-When-Then and make them specific and measurable — avoid vague words like "fast" or "easy." Cover the main path and the obvious error cases.

## Cut to the minimum with MoSCoW

6. **Sort every story into Must / Should / Could / Won't.**
   - **Must** = the product is pointless without it.
   - **Should** = important but the MVP survives without it.
   - **Could** = nice to have.
   - **Won't** = explicitly out of scope for this release (keep it visible so it doesn't creep back in).
7. **The MVP is the Musts only.** Defer everything else. Scoping is mostly subtraction — when in doubt, cut it.

## Build, measure, learn

8. **Ship the smallest Must-have set, then measure real behavior** — what users *do*, not what they say. Ignore vanity metrics (signups with no engagement).
9. **Decide: pivot or persevere.** Act on the evidence. If the assumption failed, change direction rather than adding more features.

## Checklist before calling the scope "done"

- [ ] The riskiest assumption is written down
- [ ] It's clear what evidence would prove/disprove it
- [ ] Needs are captured as user stories with testable acceptance criteria
- [ ] Every story is tagged Must / Should / Could / Won't
- [ ] The MVP contains only Must-haves
- [ ] There's a defined metric of real user behavior to watch
- [ ] A cheaper non-code test was considered first

## When unsure

If the feature list keeps growing, you've lost the assumption — return to step 1 and re-ask what you're trying to learn. When a feature's priority is debated, default to Won't for this release; it can always come back in the next one.

## Based on

- The Lean Startup (Eric Ries) — MVP and the Build-Measure-Learn loop
- User stories and acceptance criteria (Agile / Mike Cohn), Given-When-Then
- MoSCoW prioritization (DSDM) — Must / Should / Could / Won't
