---
name: rapid-prototyping
description: Build a throwaway prototype fast and well — the craft of making a rough working version to answer one question, not a small production app. Covers: pin the single thing the prototype must demonstrate or de-risk; pick fidelity (low early, high only once a flow is settled or when credibility is itself under test); build the happy path only and skip error handling, auth, tests, and edge cases; reuse components/design systems and fake data, integrations, and the AI (Wizard-of-Oz) rather than build them; spend effort on the uncertain part and stub the rest; build it to throw away and rebuild — never promote prototype code to production; and with AI coding assistants, state the goal first, use a familiar stack, add the design system early, and review security before real users. Use when building, scaffolding, mocking up, spiking, or vibe-coding a prototype, proof-of-concept, demo, clickable or Wizard-of-Oz prototype, or any quick working version to show or test an idea — even if the user doesn't say "skill." Defers the riskiest-assumption and what-to-cut call to mvp-scoping, stack/architecture to technical-planning, usability testing to ux-usability, and the pre-production security review to secure-coding.
metadata:
  version: 1.0
---

# Rapid Prototyping

## Intent

Build a rough, working version fast to answer one question, then throw it away. This skill
governs *how* to build a prototype well — not whether to build one or what to test (that is
[[mvp-scoping]]). It follows throwaway-prototyping practice (Brooks, McConnell) and evidence
on what makes software prototyping fast: reuse, faked parts, and ruthless scope. Speed comes
from doing less, on purpose.

## Build against one question

1. **Pin the one thing it must demonstrate or de-risk** before scaffolding anything; let it
   decide what to build and what to fake. *Which* assumption is worth testing is
   [[mvp-scoping]]'s call — here you execute against it, you don't re-derive it.
2. **Choose fidelity by the question.** Low-fi (sketch, wireframe, clickable) for concept and
   flow; high-fi (realistic look and interaction) only once a flow is settled, or when
   credibility/trust is itself what you're testing. Don't polish before the concept holds —
   polishing the wrong solution is the classic waste.

## Build to throw away

3. **Treat the code as disposable** — that permission is what makes it fast. Plan to rebuild
   the real version; **never promote prototype code to production.** Shipping the throwaway is
   how a "quick demo" becomes years of fragile code.
4. **Happy path only.** Build the one path that shows the idea end to end. Skip error
   handling, auth, tests, edge cases, performance tuning, docs, and design patterns — unless
   one of them *is* the thing you're testing.

## Reuse and fake everything that isn't the point

5. **Reuse before you write.** Assemble from a component library / design system and
   templates, and integrate the design system early for consistency. Don't hand-build what a
   prebuilt part gives you.
6. **Fake the slow and hard parts.** Mock data, stub external integrations, and simulate the
   AI — scripted or Wizard-of-Oz — so you can show the experience before the backend or model
   exists. **Label fakes as fake** so no one mistakes the demo for the real thing.
7. **Spend effort where it's uncertain.** Put real work into the poorly-understood part and
   keep everything around it cheap. Don't gold-plate what you already understand.

## When building with an AI assistant

8. **State the goal and the user's path before prompting**, stick to a familiar,
   well-documented stack, add the design system early, and refactor in passes. Stack or
   architecture choices that will outlive the prototype belong to [[technical-planning]].
9. **Review security before any real user or real data touches it.** AI-generated and
   happy-path code routinely leaks API keys, skips input validation, and misconfigures CORS.
   Hand that review to [[secure-coding]].

## Iterate

10. **Short loops:** build the cheapest adequate version, get it in front of someone, learn,
    rebuild — don't polish between loops. Testing it with users is [[ux-usability]]'s method.

## Checklist before calling the prototype "done"

- [ ] The one question or risk the prototype answers is written down
- [ ] Fidelity matches that question — no higher than needed
- [ ] Only the happy path is built; plumbing (errors/auth/tests/edge cases) skipped unless under test
- [ ] Reused components / design system instead of hand-building the available
- [ ] Data, integrations, and the AI are faked where not under test — and labeled as fake
- [ ] Effort concentrated on the uncertain part; nothing gold-plated
- [ ] Built as a throwaway; the path to production is a rebuild, not a promotion
- [ ] If AI-built or happy-path: a security pass is queued before real users/data ([[secure-coding]])
- [ ] The assumption behind it came from [[mvp-scoping]], not invented here

## When unsure

If you can't name the one question, stop — that's [[mvp-scoping]]'s job; get it first. If
you're adding error handling, auth, or tests "to be safe," ask whether that's what you're
testing; if not, cut it. If the demo only runs on fake data, the riskiest assumption isn't
validated yet — say so, and test on real data/users before anyone trusts it. If the prototype
works and people want to ship it, don't promote the throwaway — hand it to
[[technical-planning]] for a real build and [[secure-coding]] for review.

## Based on

- Fred Brooks, *The Mythical Man-Month* — "plan to throw one away; you will, anyhow."
- Steve McConnell, *Rapid Development* — throwaway prototyping: fake data, happy path, and
  effort on the poorly-understood part.
- Software prototyping practice — throwaway vs. evolutionary; prototype to learn, then discard.
- "What influences the speed of prototyping? An empirical investigation of twenty software
  startups" (arXiv:1712.00674) — speed via reuse, faked integrations, and scope discipline.
- Wizard-of-Oz prototyping for AI — simulate the model to test the experience; mind the
  "no AI left in the product" trap.
- AI-assisted / "vibe coding" practice — goal-first prompting, familiar stacks, design-system
  early, and a security review before real users.

## Examples

**Fidelity — ❌ over-build vs ✅ fake it**
- ❌ Hand-build auth and a real database so the demo is "real" before anyone has seen the flow.
- ✅ Hardcode one demo user, fake the data, and spend the time on the one screen that tests the idea.

**Faking the AI — ❌ model-first vs ✅ experience-first**
- ❌ Wire up the real model API first, then design the experience around whatever it returns.
- ✅ Script / Wizard-of-Oz the AI to nail the experience, label it illustrative, then swap in the real model.

**Throwaway — ❌ promote vs ✅ rebuild**
- ❌ The prototype worked, so ship its code to production.
- ✅ The prototype answered the question; rebuild it properly ([[technical-planning]]) with the plumbing and security it skipped.
