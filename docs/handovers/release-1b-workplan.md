# Release 1b — Work Skeleton & Pipeline Guide (for parallel chats)

**Product:** Community AI Workflow Studio (the Governed AI Ladder) · **Date:** 2026-11-15
**Source of truth for tickets:** the Notion Kanban `Tasks Go Here` → filter **Release = 1b** (47 cards,
grouped by a **Chunk** field, 1–5). This doc is orientation only; the board is authoritative.

---

## Part 1 — The governed-run pipeline (the shared spine)

Every AI task flows through **one** function: `runGovernedSkill()` in `studio/lib/domain/pipeline.ts`.

Steps today:
1. **Context** — load the Skill + the org's **active policy**; fold policy rules into the system prompt (`withPolicyContext`).
2. **Open task run** — `createTaskRun`, stamped with the policy in force (provenance + inheritance).
3. **Draft** — `draftWithClaude` (Sonnet); the *only* place the model is called.
4. **Self-critique** — ⚠️ STUBBED (`pipeline.ts`). Chunk 1 replaces this.
5. **Rule-check** — `ruleCheck()` in `guardrails.ts`: deterministic, code *outside* the model (can't be prompt-injected).
6. **Provenance + persist** — label the output, save it.
7. **Status + audit** — append-only audit event; return `completed | needs_review | blocked`.

Layering (ADR-0003, enforced by `scripts/arch-gate.mjs`):
`Presentation (app/*.tsx) → Service (actions.ts) → Domain (lib/domain) → Data-Source (lib/data, only place touching Supabase or the Claude SDK)`.
**Leak test:** no business/governance logic in the UI.

1b features are either **new steps inside the spine** (self-critique, PII strip, approval gate → edit
`pipeline.ts`/`guardrails.ts`) or **new readers of what the spine logs** (dashboard, audit export → no spine edits).

## Part 2 — The chunks (47 cards)

- **① Doer core (8)** — Skill-runner screen + real self-critique + thank-you Skill + tone check + in-context rule + shared app shell. *Edits the spine.* **Specced.**
- **② Safety net (10)** — PII detect/strip, human-approval gate, risky-use flagging, in-moment warning, provenance update. *Edits the spine.* **Specced.**
- **③ Registry view (4)** — usage dashboard, my-entries, empty state, entry-correction. *Read-side.*
- **④ Living policy (10)** — editable rules, rule-suggestions, expert defaults, portability.
- **⑤ Coach/Report/Onboard (15)** — coaching (Epic 6), funder reporting (Epic 7), onboarding (Epic 8).

MMP (not 1b): Epics 9 (Workflows) + 10 (Justice Layer).

## Part 3 — Running several chats at once

**🔴 Collision rule:** only **one** chat edits the spine (`pipeline.ts`, `guardrails.ts`, shared `lib/data`
`runs.ts`/`policy.ts`). Every other lane adds **new** files and never touches the spine. Each lane =
own branch/worktree → own PR. Migrations get **unique timestamps**.

**Wave 0 (first, foundational):** shared app shell + theme → every screen inherits it.

**Wave 1 (parallel):**
| Lane | Work | Spine? |
|---|---|---|
| A — Spine | Chunk 1 (runner + self-critique), then Chunk 2 | **Yes — owns it** |
| B — Dashboard | Chunk 3 registry view | No (read-side) |
| C — Reporting | Chunk 5 / Epic 7 audit trail + export | No (read-side) |
| D — Onboarding | Chunk 5 / Epic 8 self-serve + free-tier | No (own screens) |

**Wave 2 (after deps):** Chunk 4 rule-suggestions (needs ③'s data); Chunk 5 coaching (needs the runner);
Chunk 2 finalize (approval gate wraps a real run).

**Standing rule for every lane:** each new/restyled screen ships to the UX + accessibility bar; every
AI-feature runs the `responsible-ai` check; nothing is "done" without `testing-code-review` + the local
verify + arch-gate (per `docs/BUILD-RULEBOOK.md`).

## Open decisions to settle with Val
- **No active policy:** when an org has no active policy, does a Skill run **proceed on baseline safety** or **block with guidance**? (Blocks the Lane A runner.)
