---
name: pitch-deck
description: Turns finished deliverables into a slide deck in one of two modes — a persuasive pitch deck (product, startup, investor, or stakeholder) or an explainer deck that teaches a topic from a finished report or research (a research-report, lecture, or training deck). Assembles existing work, never new analysis. Use when building, outlining, writing, or reviewing any pitch deck, slide deck, presentation, or slides — even if the user doesn't say "skill." Enforces one message per slide with the title as the takeaway, the core idea as a designed centerpiece, and sourcing integrity under compression (figures as ranges with the firm named, quotes only around verbatim text, synthesis stated as ours). Pitch mode leads with the pain at magnitude and ends on vision; explainer mode defines terms first, proves each claim with a visual or worked example, and ends on a recap of what to do. Do NOT use to produce the underlying analysis, PRD, or report itself (write those first; use product-specs for the PRD).
metadata:
  version: 1.1
---

# Pitch Deck

## Intent

Turn finished deliverables into a one-glance slide deck — a **pitch** that persuades someone to
act, or an **explainer** that teaches someone to understand. Both modes share the same craft and
the sourcing discipline that compression threatens; only the arc and the close differ. The skill
*assembles* existing work, it doesn't re-analyze, and consults [[ux-usability]] and
[[accessibility]] for slide legibility.

## Rules

### Pick the mode first

1. **Pitch or explainer — decide before the first slide.** Ask what the audience should do
   afterwards: *decide or back something* → pitch (rules 2–9); *understand something* → explainer
   (rules 2–6 and 10–14). A homework research-report deck, a lecture recap, or a training deck is
   an explainer; a product, startup, or stakeholder deck is a pitch. Mixing the two arcs produces
   a deck that neither teaches nor persuades.

### Both modes

2. **Synthesis, not new thinking.** Build every slide from a finished deliverable and trace each
   one to it — a pitch from [[audience-segmentation]], [[market-analysis]],
   [[competitive-analysis]], [[positioning]], [[mvp-scoping]], and [[product-specs]]; an explainer
   from the finished report or research it presents. If the source doesn't exist yet, stop and
   write it first — don't invent it on a slide.
3. **Sourcing integrity under compression — the headline rule.** A deck's short lines are where
   invented precision and fake quotes creep in. Figures stay **ranges with the firm named**;
   quotation marks go **only** around text verbatim from a named source; our synthesis is stated
   plainly as ours; never manufacture a single clean number the sources don't give.
4. **One message per slide; the title is the takeaway.** Write the title as a full-sentence claim
   and make the body prove it — so a reader skimming only the titles still gets the whole story.
   If a slide carries two messages, split it.
5. **Show the mechanism, don't assert the adjective.** For any "safe," "better," or "responsible"
   claim, show *how* — the concrete mechanism and a measurable outcome.
6. **Make the core idea a designed centerpiece, and cut what doesn't serve a takeaway.** The one
   central idea gets a real visual, all diagrams share one visual language, and decoration that
   proves nothing comes out — extra material competes with the point for attention.

### Pitch mode

7. **Problem at magnitude, led by the pain.** Name the specific gap *and* its scale; open on the
   human pain or value, not the mechanism — or the product reads as a vitamin, not a painkiller.
   Aim for ~10 slides.
8. **Solution maps to the problem.** Show the steps between pain and resolution, slide-for-slide
   against the problem — not a feature list.
9. **End on vision, not an ask.** Close on the vision and the one thing to validate next. Keep an
   explicit "ask" only when it genuinely is a fundraise.

### Explainer mode

10. **Follow the source's structure, not the pitch arc.** Mirror the report's sections so the deck
    and the document reinforce each other — for a research report: what it is → how it works →
    what goes wrong (and the consequence) → why it's hard → how to fix it. Size the deck to the
    content, one concept per slide, rather than to a fixed count.
11. **Define terms before you use them.** Introduce the few key terms on first use or on one early
    slide, because a learner who stalls on a word misses the claim built on it.
12. **Prove each claim with visual evidence, not pasted report text.** Pair the sentence title with
    a diagram, a table, or a worked example. Bullets copied from the report turn the deck into a
    worse copy of the document.
13. **Make every abstract idea concrete with a worked example — kept safe.** Show one real case per
    idea (an analogy, a harmless test input, a before-and-after). For security topics, illustrate
    with recognised harmless test strings and the defense, never a working attack recipe — the deck
    should teach how to protect, not how to break in.
14. **End on a recap and what to do.** Close with the three or so takeaways and the actions the
    audience should take, so the last slide is the one they remember.

## Checklist before calling it done

- [ ] Mode chosen (pitch or explainer) and the arc matches it
- [ ] Every slide traces to a finished source deliverable (nothing invented)
- [ ] Figures are ranges with the firm named; quotes only verbatim; our synthesis stated as ours
- [ ] One message per slide; every title is a full-sentence takeaway
- [ ] Claims shown as mechanisms + outcomes, not adjectives
- [ ] Core idea is the designed centerpiece; one visual language; no decoration that proves nothing
- [ ] Pitch: problem at magnitude led by the pain; solution maps to it; closes on vision
- [ ] Explainer: mirrors the source's structure; terms defined first; visuals and worked examples, not
      pasted text; security examples harmless; closes on recap + actions

## When unsure

If the audience's next step is unclear, ask whether they should *decide* (pitch) or *understand*
(explainer). If a number can't be traced to a source as a range, leave it off. If a slide needs two
takeaways, it's two slides. If a claim can't be shown as a mechanism, cut it or find the mechanism.
If an example would work as a real attack, swap in a harmless test input. Hand positioning to
[[positioning]], sizing to [[market-analysis]], and the PRD to [[product-specs]] — this skill
arranges their output, it doesn't reproduce it.

## Based on

- Guy Kawasaki — the 10/20/30 rule (≤~10 slides, one message each, a readable floor).
- Sequoia Capital — the pitch narrative arc (purpose → problem → why now → solution → market →
  product → differentiation → close).
- Rockefeller Foundation — *Digital Storytelling for Social Impact* (pair every story with a
  measurable outcome).
- Michael Alley — the assertion-evidence slide (a sentence headline supported by visual evidence).
- Richard E. Mayer — principles of multimedia learning (coherence, signaling, segmenting,
  pre-training).
- The project's own sourcing-integrity norm (ranges with the firm named; quotes only verbatim;
  synthesis stated as ours).
- Composes with [[positioning]], [[market-analysis]], [[competitive-analysis]],
  [[audience-segmentation]], [[mvp-scoping]], [[product-specs]], [[ux-usability]],
  [[accessibility]].

## Examples

**Sourcing under compression — ❌ invented precision vs ✅ range with firm named**
- ❌ "The AI-governance market is $2.6B, growing 40%."
- ✅ "AI governance: ~$2.6–5.8B by 2030–34, CAGR ~35–45% (The Business Research Company; P&S
  Intelligence; IMARC)."

**The pitch close — ❌ fundraise tail vs ✅ product-pitch vision**
- ❌ "We're raising $500K to hire a team and go to market."
- ✅ "Next: validate the first climb with real nonprofits — do they seed a policy, then trust and
  reuse a governed Skill?"

**An explainer slide — ❌ topic title + pasted bullets vs ✅ assertion + evidence**
- ❌ Title "Database layer vulnerabilities," then seven bullets copied from the report.
- ✅ Title "One string-built query lets a login form become a database command," then a diagram of
  the form → query path with the harmless test input `' OR '1'='1` and the parameterized fix
  beside it.
