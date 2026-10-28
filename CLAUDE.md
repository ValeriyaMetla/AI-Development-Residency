# AI Development Residency

This repository contains a set of enterprise-development Skills that Claude should
apply consistently across all work in this project.

## How to work in this project

At the start of every task, review whether any of the Skills below apply to the
request, and follow the relevant Skill(s) before and while producing code or designs.
When a task touches more than one area, apply all the Skills that fit. These Skills
encode required standards for this project — treat them as the default way of working,
not optional suggestions.

## Available Skills (in `.claude/skills/`)

- **secure-coding** — Apply whenever handling user input, authentication, secrets,
  access control, queries, or any untrusted data. (OWASP Top 10)
- **ux-usability** — Apply when designing or building any user-facing interface,
  screen, form, or flow. (Nielsen's heuristics + enterprise UX)
- **accessibility** — Apply when building or reviewing any UI, HTML, component,
  image, color, or interaction. (WCAG 2.2 AA / POUR)
- **testing-code-review** — Apply when writing tests or reviewing a change before it
  ships. (Testing pyramid + Google review practices)
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

## Default expectations

- Security and accessibility are requirements, not enhancements.
- Verify work with tests and review before calling it done.
- Document the *why*, and keep docs current with the code.
- Prefer the minimum viable scope; cut rather than add.

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
