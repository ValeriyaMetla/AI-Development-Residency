# Week 1 — Claude Skills

This is my Week 1 coding challenge: a set of six Claude **Skills** that teach Claude to
perform enterprise-level development tasks consistently.

> **Where the skill files live:** the skills are kept in one place —
> [`.claude/skills/`](../.claude/skills/) at the repository root — because that is the
> only location Claude Code loads skills from. This README (under `Week 1/`) is the
> submission guide; each skill below links directly to its file.

## What is a Skill?

A Skill is a folder containing a `SKILL.md` file that Claude reads and follows. The
file has two parts: YAML frontmatter (a `name` and a `description` that tells Claude
*when* to use the skill) and a markdown body (the rules Claude follows once the skill
is active). At the start of a session Claude loads every skill's name and description,
then loads a skill's full instructions when a task matches its description.

## The six skills

| Skill | Topic | Grounded in (authoritative source) |
|-------|-------|-------------------------------------|
| [secure-coding](../.claude/skills/secure-coding/SKILL.md) | Security | OWASP Top 10 |
| [ux-usability](../.claude/skills/ux-usability/SKILL.md) | UX / Usability | Nielsen's 10 Usability Heuristics + enterprise UX |
| [accessibility](../.claude/skills/accessibility/SKILL.md) | Accessibility | WCAG 2.2 Level AA (POUR principles) |
| [testing-code-review](../.claude/skills/testing-code-review/SKILL.md) | Testing & Code Review | Testing Pyramid + Google engineering practices |
| [documentation](../.claude/skills/documentation/SKILL.md) | Documentation | Diátaxis framework + Google/Chromium doc practices |
| [mvp-scoping](../.claude/skills/mvp-scoping/SKILL.md) | Product / MVP Scoping | Lean Startup + user stories + MoSCoW |

The first five cover enterprise-development quality. The sixth (`mvp-scoping`) was
added as a foundational product-development skill for building a first MVP.

## How the skills are used and enforced

- **Live location:** the skills Claude actually loads live in
  [`.claude/skills/`](../.claude/skills/) at the repository root. Claude Code only
  reads skills from there.
- **Startup enforcement:** the repository's [`CLAUDE.md`](../CLAUDE.md) file loads
  automatically at the start of every Claude session. It lists all six skills and
  instructs Claude to apply the relevant ones to every task, which is how the skills
  are "enforced" to be active each session.

## How each skill is structured

Every `SKILL.md` follows the same research-backed template:

1. A specific, keyword-rich **description** (so Claude knows when to trigger it)
2. A short intent line
3. **Numbered rules** grounded in an authoritative source
4. A **checklist** Claude runs before calling the work done
5. A **"when unsure"** guardrail
6. A **"based on"** section citing the sources
