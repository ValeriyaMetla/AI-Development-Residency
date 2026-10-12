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
- **mvp-scoping** — Apply when planning a product, defining an MVP, or prioritizing
  what to build or cut. (Lean Startup + user stories + MoSCoW)

## Default expectations

- Security and accessibility are requirements, not enhancements.
- Verify work with tests and review before calling it done.
- Document the *why*, and keep docs current with the code.
- Prefer the minimum viable scope; cut rather than add.
