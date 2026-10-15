# Hand-off — Skills Library build sessions

Read this first. It's the brief for continuing to populate the skills library and develop
new skills in a fresh chat.

---

## Who & what

- **Val** — Tech Fleet AI Development Residency (premium track). Building a product
  (Community AI Workflow Studio) but keeping the skills library **general** so it serves
  the whole residency regardless of product scope.
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
- **Startup enforcement:** [`CLAUDE.md`](CLAUDE.md) — loads every session, lists the skills.
- **Week 1 submission:** [`Week 1/README.md`](Week%201/README.md).

## Current state (as of Oct 14, 2026)

**Built (8):** secure-coding · ux-usability · accessibility · testing-code-review ·
documentation · mvp-scoping · product-specs · technical-planning.
**Planned (12):** prompt-engineering · agentic-workflow-design · rag-retrieval ·
ai-evaluation · responsible-ai · clean-code · error-handling-logging · security-testing ·
deployment · git-workflow · api-integration · seo-aeo.

## The build method (follow this for every new skill)

1. **Research first.** Find the *authoritative* source for the topic (e.g. OWASP, Nielsen,
   WCAG, Anthropic docs, Lean Startup). Judge source quality — prefer primary/standard
   sources over vendor blogs.
2. **Write on the fixed template:**
   - keyword-rich **description** (what it does *first*, then "Use when…" + triggers; third
     person; ≤1024 chars)
   - one-line **intent**
   - **numbered rules** grounded in the source
   - a **checklist** ("before calling it done")
   - a **"when unsure"** guardrail
   - a **"based on"** section citing sources
3. **Keep it concise** — only what Claude doesn't already know. Body well under 500 lines.
4. **Review gate — produce the draft as a file in chat FIRST, before touching the repo.**
   Write the full `SKILL.md` to a draft file and surface it in chat for Val to read.
   **Do not create it under `.claude/skills/` or commit anything yet.** Val reviews it,
   may do additional research, and requests changes. Wait for an explicit approval.
5. **Install it — only after Val approves (3 steps):** create
   `.claude/skills/<name>/SKILL.md` → add a line to `CLAUDE.md` → paste the content into
   `SKILLS-LIBRARY.md` and flip ⬜ to ✅.
6. **Commit & push** (Val does this hands-on to keep practicing):
   `git add . && git commit -m "Add <name> skill" && git push`

## Build order (just-in-time — build right before the week that needs it)

| Build next | For week | Due |
|---|---|---|
| ~~`product-specs`, `technical-planning`~~ ✅ done | W2 — Product Specifications | Oct 26 |
| `deployment`, `git-workflow` | W3 — Host a Web App | Nov 2 |
| `prompt-engineering`, `agentic-workflow-design`, `ai-evaluation` | W4 — AI Chatbot | Nov 9 |
| `security-testing` | W5 — PenTest | Nov 16 |
| `clean-code`, `error-handling-logging` | W6 — PWA + Microservices | Nov 30 |
| `api-integration` | W7 — Integrate Apps | Dec 14 |
| `seo-aeo` | W8 — SEO/AEO | Dec 21 |

*(`responsible-ai` and `rag-retrieval` fit around W4, if the product needs them.)*

**Start here next time:** the W3 skills — `deployment` and `git-workflow`.

## Conventions & preferences

- **DRY** — one source of truth. No duplicated skill copies (Week 1 folder links to the
  real skills; don't re-copy them).
- **Naming:** `lowercase-hyphen`, descriptive, matches folder name.
- **No `.DS_Store`** in git (already in `.gitignore`).
- Commit ≠ push — remember to push after committing.

## Open items

- ⬜ **Week 1 one-page summary** — Val writes this **by hand (no AI)**; it's an assignment
  rule. Don't draft it. (Raw material: the research trail + the library.)

## How to start the next chat

Open a session in `~/Desktop/AI-Development-Residency` and paste:

> "Continue my skills library. Read HANDOFF.md and SKILLS-LIBRARY.md, then let's build the
> Week 3 skills (deployment and git-workflow) using the research-first method.
> Teach me as we go."
