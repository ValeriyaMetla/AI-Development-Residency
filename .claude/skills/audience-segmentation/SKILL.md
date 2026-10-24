---
name: audience-segmentation
description: Produces an audience segmentation and use-cases deliverable — segment the audience across four lenses (geographic, behavioral, demographic, socioeconomic), name the focus audiences as labeled segments with trait descriptions, then map each one's motivations, situational and life goals, and a business-goals/use-cases table (problem aspect → when it happens today → business goal → future scenario to support). Use when defining target audiences, audience segments, personas, or "who is this for"; when running an audience/segmentation workshop; or when filling a segmentation, motivations, goals, or use-case template — even if the user doesn't say "skill." Keep entries in tight sticky-note phrasing. Defers root-cause discovery to problem-framing and the MVP bet to mvp-scoping; do NOT use for the full PRD (use product-specs).
metadata:
  version: 1.0
---

# Audience Segmentation & Use Cases

## Intent

Turn a vague "who is this for?" into named, defensible audiences and the use cases worth supporting for them. This skill enforces the Tech Fleet segmentation workshop: spread traits across four lenses, narrow to the most impactful audiences, then map motivations → goals → a use-case table — all in tight sticky-note phrasing. It composes with [[problem-framing]] (roots + no-solutions), [[mvp-scoping]] (the bet/cut), and [[product-specs]] (the what & why).

## Rules

1. **Spread across four lenses before narrowing.** Brainstorm candidate traits under **geographic, behavioral, demographic, socioeconomic** — then pick the *most impactful* traits. Say so when a lens is low-signal rather than forcing content.
2. **Research before inventing.** Ground segments in real sector data (adoption rates, org sizes, budgets, behaviors), not assumptions pulled from thin air.
3. **Name 1–2 focus audiences as `label + trait description`.** Each is a semantic label ("The Accountable Leader") plus a prose description bundling its defining traits. **One label per audience.**
4. **Motivations = deeper drivers, not tasks.** Phrase as short "Desire to…" statements — the *why* beneath their goals (e.g. "Desire to not be the one who gets blamed"), never a feature.
5. **Goals = outcomes, not solutions.** List **Situational Goals** (what they want in specific moments of the experience) and, when useful, **Life Goals** (broader life/career outcomes). If a goal names a feature, back up to the outcome.
6. **Use-case table — one row per problem aspect, four columns:**
   - **Scenario-based problem aspect** — a slice of the challenge *today*, as a state of the world (no blame, no solution).
   - **Customer experience** — *when* it happens today.
   - **Business goals** — "We want…" (solution-free).
   - **Future scenarios to support** — "Helping…" (may be capability-facing, but stays outcome-anchored).
7. **Keep it sticky-note tight.** 3–6 words / one idea per motivation and goal; short bullets in table cells. Match the workshop's example format — not long prose.
8. **Flag audiences as assumptions to validate.** Segmentation is a living v1, owned by the PM, that evolves with research. Say which parts are assumptions.

## Checklist before calling it done

- [ ] Traits spread across all four lenses before narrowing
- [ ] Segments grounded in research, not pure guesswork
- [ ] Each focus audience = one label + one trait description
- [ ] Motivations are "Desire to…" drivers, not features
- [ ] Situational (and life) goals are outcomes, not solutions
- [ ] Use-case table: one problem aspect per row, all four columns filled
- [ ] Problem aspects = state of the world (no blame, no solution); business goals solution-free
- [ ] Entries in tight sticky phrasing matching the example
- [ ] Audiences explicitly flagged as assumptions to validate

## When unsure

If a "goal" or "business goal" names a feature, it's a solution — back up to the outcome ([[problem-framing]]'s no-solutions rule). If two very different people fall under one audience, split them into separate labels. If a segment feels invented, go find data or mark it an explicit assumption. Hand root-cause digging to [[problem-framing]] and the MVP cut to [[mvp-scoping]]; this skill owns *who* and *which use cases*, not the root or the bet.

## Based on

- Tech Fleet — "Audience Segmentation, Goals, Motivations and Use Cases Workshop" (segment traits → audiences → motivations → situational/life goals → use-case table).
- Composes with [[problem-framing]], [[mvp-scoping]], [[product-specs]].

## Examples

**Motivation — ❌ solution vs ✅ driver**
- ❌ "A dashboard to track AI use" *(a feature)*
- ✅ "Desire to not be the one who gets blamed" *(the drive behind the goal)*

**Situational goal — ❌ solution vs ✅ outcome**
- ❌ "A filter that strips private data" *(a solution)*
- ✅ "Avoid exposing private data" *(the outcome they want)*

**Problem aspect — ❌ blame/feeling vs ✅ state of the world**
- ❌ "Users are frustrated they have no AI policy" *(blames the user, vague)*
- ✅ "Accountable for the org's AI use but has no framework to govern it" *(state of the world, no solution)*
