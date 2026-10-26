---
name: market-analysis
description: Produces a market-analysis deliverable — size and shape the opportunity before building: define the market segments (the categories of products/services the product fits), size each with sourced figures, and name the market opportunity (the gap worth pursuing). Use when sizing a market, assessing market opportunity or TAM/SAM/SOM, mapping market segments or categories, judging whether a market is big enough and worth entering, or filling a market-analysis template — even if the user doesn't say "skill." Grounds every figure in a named source as a range (no invented precision) and names the true addressable intersection, not just the headline TAM. Consults audience-segmentation for who; feeds competitive-analysis and product-specs. Do NOT use for competitor/feature comparison (use competitive-analysis) or the PRD (use product-specs).
metadata:
  version: 1.0
---

# Market Analysis

## Intent

Prove a market is real, big enough, and has an unserved gap — before betting on a product. This skill enforces the market-analysis half of the Tech Fleet Market Research workshop: segments → size → opportunity, every figure grounded in sourced data. It composes with [[audience-segmentation]] (who), [[competitive-analysis]] (who else), [[mvp-scoping]] (the bet), and [[product-specs]] (the what & why).

## Rules

1. **Segments = market categories, not audiences.** Identify the categories of products/services (for-profit and nonprofit) that solve the same job the product does; mark **primary** (direct competition) vs **adjacent** (partial overlap). Defer *who* to [[audience-segmentation]].
2. **Size with sourced figures, as ranges.** Every market-size number cites a **named research firm** and is given as a **range** when sources disagree — never invent precision. Note the base year and horizon.
3. **Separate the headline TAM from the real addressable slice.** Name the product's actual target as the **intersection** of the markets it spans. If that intersection has no clean figure, say so — that's usually the opportunity, not a hole in the analysis.
4. **Opportunity = big enough + not too crowded.** Test each segment on size *and* competition; name the **whitespace** (the unserved overlap) and why it's winnable. Keep it solution-free — an opportunity, not a feature.
5. **Ground in research before asserting.** Do a real sourcing pass (web / sector data) before drafting; cite sources inline. Flag anything that's an inference rather than sourced.
6. **Keep it tight and in the right shape.** Segment/opportunity notes in short sticky phrasing; sizing in a table (market · segments · today's size · top companies · projected growth), each cell sourced.

## Checklist before calling it done

- [ ] Segments are market categories (not audiences); primary vs adjacent marked
- [ ] Every size figure cites a named source, as a range, with base year/horizon
- [ ] The addressable intersection named separately from the headline TAM
- [ ] Opportunity tested on size + crowding; whitespace named and solution-free
- [ ] Figures grounded in research; inferences flagged
- [ ] Sticky notes tight; sizing in a sourced table

## When unsure

If a "segment" is a type of *user*, that's an audience — hand it to [[audience-segmentation]]. If a market figure has no source, find one or mark it an explicit assumption; never state invented precision. If the "opportunity" names a feature, back up to the outcome/gap. Hand competitor and feature detail to [[competitive-analysis]] and the MVP cut to [[mvp-scoping]].

## Based on

- Tech Fleet — Market Research Workshop (market analysis: segments → size → opportunity).
- TAM / SAM / SOM market-sizing practice.
- Composes with [[audience-segmentation]], [[competitive-analysis]], [[mvp-scoping]], [[product-specs]].

## Examples

**Size figure — ❌ invented precision vs ✅ sourced range**
- ❌ "The AI governance market is $4.2B." *(no source, false precision)*
- ✅ "AI governance ~$0.31–0.35B (2025–26) → ~$2.6–5.8B by 2030–34 (The Business Research Company; IMARC)."

**Segment — ❌ audience vs ✅ market category**
- ❌ "Non-technical nonprofit directors" *(an audience)*
- ✅ "Responsible-AI / AI governance platforms" *(a market category the product sits in)*
