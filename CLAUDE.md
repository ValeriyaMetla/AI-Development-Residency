# AI Development Residency

This repository contains a set of enterprise-development Skills that Claude should
apply consistently across all work in this project.

## How to work in this project

At the start of every task, run an explicit **routing check before producing anything** —
do not rely on a skill triggering on its own (Claude tends to under-trigger):

1. **Place the task in the taxonomy.** Identify which of the six categories in
   [`docs/SKILLS-LIBRARY.md`](docs/SKILLS-LIBRARY.md) the task's core work falls in — most
   tasks touch one or two (a PRD → *Product & Planning*; a query handler → *Security &
   Testing* + *Code Craft*).
2. **Scan those categories in full, plus the always-consult standards.** Read every skill in
   the matched category/categories against the request — including each skill's "Use when…"
   phrases *and* its "Do NOT use (use X)" boundaries, which also point to skills in *other*
   categories. Then, **regardless of category, always check the cross-cutting standards**
   against what you're producing: `secure-coding` (any untrusted data), `testing-code-review`
   (before "done"), `accessibility` + `ux-usability` (any UI), `documentation` (any README /
   API / comment), `judge-arch` (any change to app code — layering, data ownership,
   dependencies, resilience, before done/PR), and `responsible-ai` (any AI-powered feature —
   model/agent call, generated content, or an automated decision about a person). Enable only the skills a task needs — don't scan unrelated specialist
   categories — but never let category-narrowing drop a cross-cutting standard.
3. **State the routing in one line, before any code, spec, or design**: name each skill you're
   loading and the phrase or aspect that fired it. If the task brushes an area where you
   considered a skill but ruled it out, say which and why in a few words — so exclusion is
   deliberate, never silent. (On pure Q&A or conversation that produces no deliverable, skip
   the routing line.)
4. **Load and follow** every matching skill before producing. When a task spans areas, apply
   all that fit (skills compose — one task can load several); respect the dependency order in
   the pipeline below.
5. **Close** with the 🧾 receipt. Routing and receipt bookend the turn: routing says what you
   plan to apply and why; the receipt reports what you actually applied and how.

These Skills encode required standards for this project — treat them as the default way of
working, not optional suggestions.

## Available Skills (in `.claude/skills/`)

- **secure-coding** — Apply whenever handling user input, authentication, secrets,
  access control, queries, or any untrusted data. (OWASP Top 10)
- **ux-usability** — Apply when designing or building any user-facing interface,
  screen, form, or flow. (Nielsen's heuristics + enterprise UX)
- **accessibility** — Apply when building or reviewing any UI, HTML, component,
  image, color, or interaction. (WCAG 2.2 AA / POUR)
- **testing-code-review** — Apply when writing tests or reviewing a change before it
  ships. (Testing pyramid + Google review practices)
- **judge-arch** — Apply when reviewing a diff/PR for architectural integrity before done or
  merge — layering, data ownership, dependencies, resilience. (Fowler layers + the 4 questions;
  back-end is `arch-gate.mjs` in CI)
- **documentation** — Apply when writing or updating READMEs, comments, or API docs.
  (Diátaxis + developer-doc practices)
- **problem-framing** — Apply when framing or validating a problem before any solution:
  finding the root (5 Whys), writing a problem statement / problem checklist, or running
  discovery. (Tech Fleet Masterclass + 5 Whys)
- **mvp-scoping** — Apply when planning a product, defining an MVP or MVP-vs-MMP,
  deciding what to build or cut, writing user stories, or producing a release vision /
  vision board / scope-of-outcomes. (Lean Startup + user stories + MoSCoW +
  Vision/Scope/Roadmap)
- **product-specs** — Apply when writing or reviewing a product spec / PRD, feature
  brief, requirements, or acceptance criteria (the *what* and *why*). (PRD practice +
  user stories)
- **audience-segmentation** — Apply when defining target audiences/segments or personas,
  running an audience segmentation workshop, or filling a segmentation, motivations,
  goals, or use-case template. (Tech Fleet Audience Segmentation Workshop)
- **market-analysis** — Apply when sizing a market, assessing market opportunity/TAM,
  mapping market segments/categories, or judging whether a market is worth entering.
  (Tech Fleet Market Research Workshop + TAM/SAM/SOM)
- **competitive-analysis** — Apply when analyzing competitors, mapping direct vs indirect
  competitors, or building a competitor / feature-comparison table to find the gap.
  (Tech Fleet Market Research Workshop)
- **positioning** — Apply when writing a positioning statement, value proposition, or the
  unique-value / differentiation section of a spec or pitch. (Geoffrey Moore + Tech Fleet)
- **pitch-deck** — Apply when building, outlining, or reviewing a pitch deck or product /
  startup / investor / stakeholder deck — synthesizing finished deliverables into a
  persuasive deck, with sourcing integrity under compression. (Kawasaki 10/20/30 + Sequoia
  arc + storytelling-for-impact)
- **technical-planning** — Apply when choosing a stack or architecture, making a
  significant technical decision, writing a build plan, sequencing a release's build,
  breaking a feature into tasks, or writing non-functional / technical requirements
  (the *how*). (ADRs + YAGNI + non-functional-first build plan + BDD + INVEST)
- **rapid-prototyping** — Apply when building a quick, throwaway prototype / proof-of-concept /
  demo / clickable or Wizard-of-Oz mockup to show or test an idea fast. (Throwaway prototyping
  + Wizard-of-Oz)
- **backlog-decomposition** — Apply when breaking a release scope into epics, features,
  and tasks, or building, structuring, or grooming a backlog / Kanban board. (SAFe
  hierarchy + INVEST + Scrum refinement + Kanban)
- **skill-evaluation** — Apply when creating, reviewing, improving, or deciding whether
  to keep a skill, or writing SKILL.md test cases. (Baseline comparison + eval-driven)
- **responsible-ai** — Apply when building, reviewing, or shipping any AI-powered feature
  (a prompt, chatbot, agentic workflow, generated content, a recommendation, or an automated
  decision about a person): human-in-the-loop, disclosure, grounding/anti-fabrication, bias
  checks, data governance, logging/monitoring. Cross-cutting — fires on any AI feature. (NIST AI RMF)

## The product-spec pipeline (dependency order — run iteratively, not waterfall)

This is a **dependency** order (what informs what), not fixed phases. On a first pass,
move through it so you don't build on unknowns; then **iterate** — revisit any stage when
evidence changes, run stages concurrently, treat every artifact as a living draft.

```
problem-framing → discovery (audience-segmentation → market + competitive → positioning)
→ mvp-scoping (vision board uses discovery) → product-specs (+ User Requirements)
→ backlog-decomposition (Epics→Features→Tasks) → technical-planning (Build Plan → NFR → Tech Reqs)
```

Working rules:

- First pass fast and low-fidelity: a thin version of every stage before polishing any.
- Prove it end to end early via the **walking skeleton** (a thin slice through all layers).
- Feed back: a later stage can overturn an earlier one — update the upstream artifact.
- Respect dependencies each loop: no MVP without the audience; no build sequence without
  the features. Order is about dependency, not the calendar.
- Every spec is an assumption until shipped and tested with real users.

## Default expectations

- Security and accessibility are requirements, not enhancements.
- Verify work with tests and review before calling it done.
- Document the *why*, and keep docs current with the code.
- Prefer the minimum viable scope; cut rather than add.

## Technical-architecture reference

Before any technical, architecture, or build work on the `studio/` app — choosing a pattern,
writing or reviewing an ADR, designing the data model, layering code, or scaffolding/deploying —
read [`docs/reference/week-4-technical-architecture.md`](docs/reference/week-4-technical-architecture.md).
It captures the Week 4 lecture and assignment: the layer model and Leak Test, the domain/data-source
patterns, ADR practice, hosting, the launch checklist, and the submission rubric. Treat its
"Our notes" (§17) as pointers to our existing ADRs and decisions, not as new rules.

**Read every ADR in [`docs/adr`](docs/adr) before making changes, and write a new ADR for every
big decision** (costly-to-reverse choices — stack, data model, layering). This is the lecture's own
rule; the ADR format and immutability conventions live in [`docs/adr/README.md`](docs/adr/README.md).

## Build gate — before "done" or a PR (Release 1a)

When working on the app (the `studio/` Release 1a build), **before calling any coding work
"done" or opening a pull request**, apply the gates in
[`docs/BUILD-RULEBOOK.md`](docs/BUILD-RULEBOOK.md) — currently its **Definition of Done** and
**Git workflow** rules. The rulebook holds the detail and is the source of truth; this line is
the switch that makes the check run every time, and it covers new rulebook gates automatically
as they are added. (This is in addition to the skill routing above — `testing-code-review` and
`secure-coding` still apply.)

## Working norms (how to collaborate)

These apply to all work in this project, not to any single skill:

- **Full final versions, not diffs.** When revising, output the complete rebuilt
  version — not just the changed lines — so it's ready to copy or use as-is.
- **Show the digging.** Share the reasoning as you go (5 Whys, raw thinking,
  trade-offs); don't hand over pre-baked conclusions.
- **One step at a time; collaborate.** Work section by section, showing reasoning and
  getting input/approval before moving on — don't jump ahead or one-shot a deliverable.
- **Receipts every working turn.** See "Skill usage receipts" below.

## Building and changing skills

The skill files in `.claude/skills/<name>/SKILL.md` are the source of truth — they are
what Claude actually loads. `docs/SKILLS-LIBRARY.md` holds the canonical template, the
build method, and the governance/index. If the two ever disagree, the files win.

When creating or changing any skill:

1. Follow the canonical template and "How skills are built" method in
   `docs/SKILLS-LIBRARY.md`.
2. Draft the full `SKILL.md` in chat for review first — nothing lands in the repo until
   approved.
3. It is not done until: the `SKILL.md` file is updated, `docs/SKILLS-LIBRARY.md` reflects
   it in the same commit, and triggering is re-tested (it fires on its own phrases plus a
   paraphrase, and not on an unrelated prompt).

## Skill usage receipts

At the end of every working turn/message that produced work, report a compact **🧾 Skill receipts** block:

- **Which** skill(s) you applied, by name.
- **Why** — what in the request triggered each one.
- **How** — what you did differently because of it.

Keep it to a line or two per skill. If no skills applied, say so in one line
("🧾 No skills applied — outside their scope"). This covers skills applied from the list
above, not only those invoked through the Skill tool (a hook logs the tool calls separately
to `.claude/skill-usage.log`).
