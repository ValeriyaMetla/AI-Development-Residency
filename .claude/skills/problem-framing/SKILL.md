---
name: problem-framing
description: Enforces disciplined problem discovery before any solution — digging to the ROOT of a user problem with the 5 Whys, breaking it into aspects, and writing a formal problem statement (root + aspect + who + when + why) plus a problem checklist (audience, goal, needs, consequences to avoid) that converts into a user story. Use when framing a problem, writing or reviewing a problem statement or problem checklist, running discovery, finding the root cause of a user pain, defining who/when/why a problem matters, or turning a vague complaint into a validated problem — even if the user doesn't say "skill." Do NOT use for the MVP bet or what-to-cut (use mvp-scoping), the full PRD (use product-specs), or how to build it (use technical-planning).
---

# Problem Framing & Discovery

## Intent

Before you bet on a solution, prove there's a real, worth-solving problem and state it precisely. This skill enforces discovery: dig past the symptom to the ROOT, break the problem into aspects, and write a formal problem statement + problem checklist that converts into a user story. It runs in three passes — dump raw problems → break down aspects and find each root → compile the formal statement and checklist. Its outputs feed [[mvp-scoping]] (the bet) and [[product-specs]] (the what & why), which reuse the problem statement and user story rather than re-deriving them. Grounded in the Tech Fleet Product Requirements Masterclass and 5 Whys root-cause analysis.

## Separate the problem from the solution (the cardinal rule)

1. **Describe the state of the world, not a feeling or a missing feature.** Banned openings: "Users are confused with ___," "Users are frustrated with ___," "There are inefficiencies with ___," and "we need a [feature]." Each smuggles in a vague symptom or a solution. Write instead: "The [world/tool] [does X], and this causes [confusion/frustration] for users when [situation]."
2. **Keep goals and needs solution-free.** The *user goal* is the outcome the audience wants (not a feature); the *user need* is the human expectation behind it (not "a button" or "a locator"). If you wrote a noun that's a feature, you've described a solution — back up.

## Dig to the root (not the symptom)

3. **Start raw, then list the aspects.** Write the unrefined problem as stated, then enumerate the real-world scenarios and situations happening *today* that contribute to it.
4. **Ask "Why is this a problem?" until you hit the root (5 Whys).** The first statement is rarely the root; keep digging for the most *meaningful* reason it's a problem for the audience.
5. **One problem per statement.** Each aspect becomes its own problem statement — a product may have many. Don't fuse several problems into one.

## Write the formal problem statement

6. **Formal statement = Root + Aspect + Who + When + Why.** Combine the root with its aspect, then add: the **audience** who experiences it (may be an assumption to validate later), **when/where** it comes up in their experience, and **why** it's meaningful to solve.
7. **Always Be Closing (ABC).** Justify why the problem is worth solving, with evidence where possible. If you can't make the case, no one — on the team or outside it — will buy in; reconsider whether to build at all.

## Build the problem checklist

8. **Every statement gets a five-part checklist:** (1) one **audience**, (2) the **problem statement**, (3) one **user goal** (outcome, not solution), (4) one or more **user needs** (human expectation, not solution or goal), (5) the **consequences the user is trying to avoid**.
9. **One audience per checklist.** If two audiences face the same problem, write a separate checklist for each so they can be prioritized independently downstream.

## Hand off to a user story

10. **Convert each checklist into a user story:** "As a [audience], I want [user goal], so that [consequence avoided / value delivered]." From here [[mvp-scoping]] and [[product-specs]] own the story and acceptance-criteria standard.

## Checklist before calling the framing "done"

- [ ] The problem describes the state of the world, not a feeling or a missing feature
- [ ] Each aspect was dug to its root with the 5 Whys
- [ ] One problem per statement; aspects split into separate statements
- [ ] The formal statement names root + aspect + who + when + why
- [ ] There's an evidence-backed reason it's worth solving (ABC)
- [ ] Each statement has a checklist: audience, goal, needs, consequences
- [ ] Goal and needs contain no solutions
- [ ] One audience per checklist
- [ ] Each checklist converts to a user story

## When unsure

If you can already name a solution, you haven't found the problem — ask "why is that a problem?" again. If a statement blames the user ("users are confused"), rewrite it as the world or the tool doing something. If two audiences show up in one checklist, split it. The audience may be an assumption — flag it to validate later rather than blocking on it.

## Based on

- Tech Fleet Product Requirements Masterclass — Problem Statements & Discovery (root problem, aspects, formal problem statement, problem checklist, user story)
- 5 Whys root-cause analysis (Sakichi Toyoda / Toyota)

## Examples

**Problem statement — ❌ symptom/blame vs ✅ root + aspect + who/when/why**
- ❌ "Users are frustrated with grocery shopping." *(blames the user, vague, no root)*
- ✅ "Grocery stores are sparsely available in low-income areas, so people in food deserts can't reliably buy nutritious food when they shop for the week — pushing them toward cheaper, less nutritious options and worsening their health." *(aspect + root + who + when + why)*

**User goal — ❌ solution vs ✅ outcome**
- ❌ "Users need a store locator with distance filters." *(a solution)*
- ✅ "Users want to obtain nutritious food within a reasonable distance of home." *(the outcome behind the goal)*
