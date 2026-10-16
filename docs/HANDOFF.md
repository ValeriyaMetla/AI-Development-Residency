# Hand-off — Skills Library build sessions

Read this first. It's the brief for continuing to populate the skills library and develop
new skills in a fresh chat.

---

## Who & what

- **Val** — Tech Fleet AI Development Residency (premium track). The skills library is kept
  **general** so it serves the whole residency regardless of product. (Product TBD — a new
  project is likely; keep these docs free of product-specific assumptions.)
- **Goal of these sessions:** build the remaining skills, one at a time, and keep the
  living library current.
- **Teaching matters:** Val is learning git/GitHub and skill-authoring. Teach as you go —
  explain *why*, don't just do it silently.

## Where everything lives

- **Repo:** `~/Desktop/AI-Development-Residency` (private GitHub repo, connected).
- **The skills:** `.claude/skills/<name>/SKILL.md` (synced account-wide to
  `~/.claude/skills/`). Folders are **flat** — no category subfolders.
- **The living library:** [`SKILLS-LIBRARY.md`](SKILLS-LIBRARY.md) — full content of every
  built skill + stubs for planned ones, organized by 6 categories, with the week roadmap.
  **This is the source of truth.**
- **Startup enforcement:** [`CLAUDE.md`](../CLAUDE.md) — loads every session, lists the skills.
- **Week 1 submission:** [`Week 1 Coding Challenge/README.md`](../Week%201%20Coding%20Challenge/README.md).

## Current state (as of Oct 16, 2026)

**Built (9):** secure-coding · ux-usability · accessibility · testing-code-review ·
documentation · mvp-scoping · product-specs · technical-planning · skill-evaluation.
**Planned (12):** prompt-engineering · agentic-workflow-design · rag-retrieval ·
ai-evaluation · responsible-ai · clean-code · error-handling-logging · security-testing ·
deployment · git-workflow · api-integration · seo-aeo.

## Building a new skill

The **skill template** and the **step-by-step build process** (research → draft → review
gate → install → commit) now live in **one place**: see "How this library works" in
[`SKILLS-LIBRARY.md`](SKILLS-LIBRARY.md). Follow it there — it isn't duplicated here.

## What's next

The full residency roadmap (which skill for which week) lives in
[`SKILLS-LIBRARY.md`](SKILLS-LIBRARY.md), the source of truth.

**Start here next time:** the W3 skills — `deployment` and `git-workflow` (due Nov 2).

## Conventions & preferences

- **DRY** — one source of truth. No duplicated skill copies (the Week 1 Coding Challenge
  folder links to the real skills; don't re-copy them).
- **Naming:** `lowercase-hyphen`, descriptive, matches folder name.
- **No `.DS_Store`** in git (already in `.gitignore`).
- Commit ≠ push — remember to push after committing.

## Open items

- ⬜ **Week 1 one-page summary** — Val writes this **by hand (no AI)**; it's an assignment
  rule. Don't draft it. (Raw material: the research trail + the library.)

## How to start the next chat

Open a session in `~/Desktop/AI-Development-Residency` and paste:

> "Continue my skills library. Read docs/HANDOFF.md and docs/SKILLS-LIBRARY.md, then let's build the
> Week 3 skills (deployment and git-workflow) using the research-first method.
> Teach me as we go."
