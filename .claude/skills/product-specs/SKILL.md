---
name: product-specs
description: Enforces clear product specifications (PRDs) — leading with the problem and the user, setting goals and non-goals before features, writing prioritized testable requirements as user stories with acceptance criteria, and defining success metrics and open questions. Use when writing or reviewing a product spec, PRD, feature brief, requirements doc, or acceptance criteria — anything describing WHAT to build and WHY before any code.
---

# Product Specifications (PRD)

A product spec aligns everyone on *what* to build and *why* before anyone writes code. It describes the problem, the user, and the desired outcome — never the implementation. If you can't state the problem, the feature isn't ready. This skill follows established PRD practice and reuses the user-story and acceptance-criteria standards from [[mvp-scoping]].

## Lead with the problem, not the feature

1. **Open with the problem and who has it.** State what's happening today, who feels the pain, and why it's worth solving — backed by evidence (support tickets, data, user quotes) where possible. "Customers miss time-sensitive updates" is a problem; "we need a notification system" is a solution in disguise.
2. **Describe the user and their context.** Name the user type and the situation they're in. Writing "Given [context], the user does [action], the system responds [response], resulting in [outcome]" surfaces edge cases early.

## Set direction before scope

3. **State measurable goals.** Each goal names the outcome that should change, specific enough that you could measure it — not "improve engagement" but a named, observable shift.
4. **State non-goals explicitly.** List 3–5 things this release deliberately does *not* do. Non-goals prevent scope creep as much as goals drive progress; without them, everything looks in scope.

## Write requirements that are testable

5. **Capture requirements as user stories** — "As a [user], I want [goal], so that [benefit]" — describing observable behavior, not intentions. (Same form as [[mvp-scoping]].)
6. **Give each story acceptance criteria.** Use Given-When-Then, specific and measurable. "Search results appear within 2 seconds," not "search should be fast." Cover error states and edge cases, not only the happy path.
7. **Prioritize every requirement.** Label must / should / could (or P0/P1/P2) so the team knows what's essential versus deferrable. Align this with the MoSCoW cut from [[mvp-scoping]] when one exists.

## Keep the "how" out

8. **No implementation details.** Technology, architecture, and data choices belong in [[technical-planning]], not here — unless a technical constraint is a fixed product requirement (e.g. "must work offline"). The PRD is for cross-team alignment on *what*; the technical plan covers *how*.

## Close with metrics and unknowns

9. **Define success metrics with a measurement method,** and add a counter-metric where a metric could be gamed (e.g. "time-on-page up" guarded by "task-completion rate not down").
10. **Record open questions and risks** with an owner for each. Write down what you don't know instead of silently assuming it.
11. **Treat the spec as living and get it reviewed.** Have design and engineering review before it's "final"; update it when the team's understanding changes. Don't write it alone — blind spots go unchallenged.

## Checklist before calling a spec "done"

- [ ] Opens with the problem and who has it, with evidence
- [ ] User type and context are named
- [ ] Goals are measurable; 3–5 non-goals are explicit
- [ ] Requirements are user stories with Given-When-Then acceptance criteria
- [ ] Error states and edge cases are covered, not just the happy path
- [ ] Every requirement is prioritized (must/should/could or P0/P1/P2)
- [ ] No implementation details (those live in the technical plan)
- [ ] Success metrics have a measurement method and a counter-metric
- [ ] Open questions and risks are listed with owners
- [ ] Design and engineering have reviewed it

## When unsure

If a statement describes *how* to build something, it probably belongs in [[technical-planning]] — move it. If you can't write a measurable acceptance criterion for a requirement, the requirement is still too vague — sharpen it before it ships. Prefer a short, clear one-pager over a long one; a longer PRD is not a clearer PRD.

## Based on

- PRD best practices — problem-first structure, goals/non-goals, testable requirements, success metrics, open questions (Marty Cagan / SVPG and common industry PRD practice)
- User stories and acceptance criteria (Agile / Mike Cohn), Given-When-Then — shared with [[mvp-scoping]]
- MoSCoW prioritization (DSDM) — must / should / could
