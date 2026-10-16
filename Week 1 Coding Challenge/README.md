# Week 1 Coding Challenge — Claude Skills

My Week 1 challenge was to set up version control (GitHub + Claude Code) and author a set
of reusable Claude **Skills** that teach Claude to perform enterprise-level development
tasks the same, high-quality way every time. I built **six skills**, each grounded in an
authoritative source (OWASP, Nielsen, WCAG, and others) using a research-first method:
find the recognized standard for the topic, then encode its rules into the skill.

> **Snapshot:** this page is my Week 1 submission (the original 6 skills). The library has
> grown since — for the current, complete set (and the governance that links the skills),
> see [`docs/SKILLS-LIBRARY.md`](../docs/SKILLS-LIBRARY.md).

> **Where the skill files live:** the skills are kept in one place —
> [`.claude/skills/`](../.claude/skills/) at the repository root — because that is the only
> location Claude Code loads skills from. They are **project-wide tools** used every week,
> so they live at the root rather than inside this week's folder. This README is the
> submission guide; each skill below links directly to its file.

## What is a Skill?

A Skill is a folder containing a `SKILL.md` file that Claude reads and follows. The file
has two parts: YAML frontmatter (a `name` and a `description` that tells Claude *when* to
use the skill) and a markdown body (the rules Claude follows once the skill is active). At
the start of a session Claude loads every skill's name and description, then loads a
skill's full instructions only when a task matches its description.

## The six skills

| Skill | What it enforces | Grounded in (authoritative source) |
|-------|------------------|-------------------------------------|
| [secure-coding](../.claude/skills/secure-coding/SKILL.md) | Defenses for untrusted input, auth, secrets, and access control | OWASP Top 10 |
| [ux-usability](../.claude/skills/ux-usability/SKILL.md) | Clear, efficient, role-aware interfaces | Nielsen's 10 Usability Heuristics + enterprise UX |
| [accessibility](../.claude/skills/accessibility/SKILL.md) | Interfaces usable by people with disabilities | WCAG 2.2 Level AA (POUR principles) |
| [testing-code-review](../.claude/skills/testing-code-review/SKILL.md) | Meaningful tests + rigorous review before shipping | Testing Pyramid + Google engineering practices |
| [documentation](../.claude/skills/documentation/SKILL.md) | Clear, current docs matched to their purpose | Diátaxis framework + Google/Chromium doc practices |
| [mvp-scoping](../.claude/skills/mvp-scoping/SKILL.md) | Ship the smallest version that tests the riskiest assumption | Lean Startup + user stories + MoSCoW |

The first five cover enterprise-development quality; the sixth (`mvp-scoping`) is a
foundational product-development skill for scoping a first MVP.

## How the skills are used and enforced

- **Live location:** the skills Claude actually loads live in
  [`.claude/skills/`](../.claude/skills/) at the repository root — Claude Code only reads
  skills from there.
- **Startup enforcement:** the repository's [`CLAUDE.md`](../CLAUDE.md) loads automatically
  at the start of every Claude session. It lists the project's skills and instructs Claude
  to apply the relevant ones to every task — which is how the skills are "enforced" to be
  active each session.

## How each skill is structured

Every `SKILL.md` follows the same six-part, research-backed template (description → intent
→ numbered rules → checklist → "when unsure" → "based on"). The template is defined
canonically in [`docs/SKILLS-LIBRARY.md`](../docs/SKILLS-LIBRARY.md) ("How this library
works") — see there for the authoritative version.

## Submission write-up

The full written submission for this challenge accompanies this README in the same folder
(written by hand, no AI).
