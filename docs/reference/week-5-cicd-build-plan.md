# Week 5 QA and CI/CD — Build Plan (revised)

## Status snapshot

- **Updated:** November 15, 2026
- **Assignment due:** November 23, 2026
- **Application:** Community AI Workflow Studio / Governed AI Ladder
- **Application directory:** `studio/`
- **Implementation repository:** [ValeriyaMetla/AI-Development-Residency](https://github.com/ValeriyaMetla/AI-Development-Residency)
- **Live application:** [ai-development-residency-nine.vercel.app](https://ai-development-residency-nine.vercel.app)
- **Assignment:** [Week 5 Coding Challenge — Build a CI/CD Pipeline](https://app.notion.com/p/419975c3b95080f0a292c64c8ad84a72)
- **Working branch:** `claude/serene-darwin-f1a4d0` (a git **worktree** — this *is* the implementation
  branch; no separate `week5/qa-cicd` branch is needed).
- **Current phase:** **CI/CD engineering complete and green on `main`.** Done: every-push triggers;
  build-reliability fix (ADR-0017); Skill gate (Structure + Library-sync) + self-tests; BDD-acceptance
  check; red→green proof (run #13 → #15); ADR-0016 landed; repo `SUBMISSION.md`, `CI-EVIDENCE.md`, and
  `manual-test-cases.md` created. **Remaining (Valeriya):** run the 2 manual tests on the live app,
  final smoke check, write the two reflections (no AI), accept ADR-0016, email the submission.
- **Notion delivery state:** Epic #11 — QA & CI/CD, 12 Must tickets.

This is an **extension of the existing quality system, not a greenfield CI setup.** The repository
already has application CI, an architecture gate, Vercel delivery, Vitest coverage, and 20 built
Claude Skills. Week 5 makes those protections run **earlier** (every push) and become **explicitly
traceable** to the Week 2 requirements, and adds a **Skills gate**.

> ### Revision note (what changed from the GPT/Codex draft, and why)
> This version corrects four things the earlier draft got wrong because it was written without
> knowing the live repo state (it ran against an offline/sandboxed audit and didn't know we work in
> a worktree):
> 1. **The red `main` baseline was real — and is now fixed.** It was a *flaky* `next/font/google`
>    build-time fetch (CI run #111 failed; the previous nine runs passed the identical code).
>    Resolved by self-hosting Roboto via `@fontsource` (**ADR-0017**); the full gate is green locally.
>    *(This corrects an earlier assumption that the red was a harmless offline artifact.)* See
>    *Verified repository baseline*.
> 2. **The Skills validator was over-specified** and would have red-failed good skills (it required
>    per-skill READMEs that don't exist, and exact section titles that vary). Started **lean**,
>    anchored to CLAUDE.md's actual Definition of Done. See *Skill validator contract*.
> 3. **Five new checks trimmed to three** (2 Skill gates + 1 BDD-acceptance job with named
>    per-dimension steps) — enough to satisfy "≥3," without 3× CI install overhead.
> 4. **No new branch** — this worktree branch is the implementation branch; triggers are already
>    widened here. (Only the disposable red/green proof branch in Phase 4 is separate.)
> Counts were also corrected: **12** Vitest files on this branch (not 13); test totals are
> discovered dynamically, never hardcoded.

## Outcome

> **Every time I push code to the Governed AI Ladder, I want automatic checks to catch bugs and
> regressions before they reach users, and to prove the code still follows our layered
> architecture, our security rules, and our Claude Skills — so our safety guarantees never quietly
> break.**

This outcome guides the implementation and evidence package. It must **not** be copied into the
user-authored submission reflection as if it were unaided writing.

## Definition of done

The homework is complete only when all of the following are true:

1. The CI and architecture workflows run on pushes to **every branch** and on pull requests
   targeting `main`.
2. **At least three newly named, Week-2-derived checks** run on every push (here: *Claude Skills —
   Structure*, *Claude Skills — Library sync*, *BDD acceptance (Release 1a)*).
3. The Week 1 Claude Skills are gate-checked on every push, and a deliberately malformed Skill makes
   the correct check fail.
4. A real branch push records a controlled **red** run followed by a **green** recovery.
5. The implementation pull request is merged only while every required check is green.
6. The merge SHA deploys successfully to Vercel.
7. Both manual test cases are **personally** run on the live app with genuine actual results, notes,
   and pass/fail decisions.
8. Any manual failure has a reproducible bug record.
9. `Week 5 Coding Challenge/SUBMISSION.md` and `CI-EVIDENCE.md` are committed with final links.
10. Valeriya personally writes the "What I Did" and "What I Learned" sections **without AI**.
11. The live application passes a final smoke check and the submission is sent by November 23, 2026.

## Verified repository baseline

### Existing protections to preserve

- [`ci.yml`](../../.github/workflows/ci.yml): ESLint, Prettier, TypeScript, Vitest, Next.js
  production build, blocking production-dependency audit, non-blocking dev-dependency report, gitleaks.
- [`arch-gate.yml`](../../.github/workflows/arch-gate.yml): deterministic internal-layering scan
  ([`scripts/arch-gate.mjs`](../../scripts/arch-gate.mjs)).
- **ADR-0006** (`docs/adr/0006-ci-quality-gate.md`): accepted dependency + security policy. Week 5
  **extends** it (ADR-0016); it is not weakened or superseded.
- **12** Vitest files on this branch under `studio/test/` (reverify the running test *total* on the
  branch — do not hardcode it).
- **20** built project Skills under `.claude/skills/`, mirrored by `docs/SKILLS-LIBRARY.md`. No
  per-skill READMEs exist; **SKILL.md is the source of truth** (per CLAUDE.md).

### The red baseline — real flaky build, now fixed (ADR-0017)

`main`'s latest CI (run **#111**, commit `1e7dde7`) genuinely **failed** at `next build` in the
`next/font` Google loader (`TypeError: Cannot read properties of null (reading '1')`). We verified
this against real GitHub Actions — it is **not** an offline/sandbox artifact.

The failure is **flaky, not deterministic**: the previous nine `main` runs (#100–#110) built the
*identical* font code successfully; only #111 failed. That is the signature of a **transient Google
Fonts fetch failure** (shared CI runner IP rate-limited at build time). Vercel deployed the same SHA
because its build hit a good fetch.

**Root cause + fix:** `next/font/google` fetches Roboto from Google at build. We removed that network
dependency by **self-hosting Roboto via `@fontsource/roboto`** (ADR-0017): `app/layout.tsx` imports
the weight stylesheets, `theme.ts` uses `fontFamily: 'Roboto, …'`. Verified locally — the full CI
gate (lint, format, types, 122 tests, **build**) is green, and the production audit reports 0
vulnerabilities (`@fontsource` has no dependencies). Lane A is idle, so no `studio/` collision.

## Settled implementation design

### Three new named checks

| Check | Source | What it proves |
| --- | --- | --- |
| **Claude Skills — Structure** | Week 1 Skills + Week 5 Skill requirement | Each `SKILL.md` is well-formed: valid frontmatter, folder/name identity, required sections present |
| **Claude Skills — Library sync** | Skills-Library definition of done | Built Skills and `SKILLS-LIBRARY.md` index agree (every real skill is listed; no orphan entries) |
| **BDD acceptance (Release 1a)** | F1.1, F1.3, F4.1/F4.2/F4.4, shipped F5.1 slice | Runs the Week-2-mapped tests; named per-dimension **steps** (Policy seed · Active-policy inheritance · Co-Pilot safety) keep traceability visible |

Notes:
- The BDD check is **one job with three named steps**, not three jobs — one `npm ci`, three labeled
  `vitest run <files>` steps. This keeps per-dimension traceability without 3× install overhead.
- The BDD steps are **traceability views over existing tests**; they do **not** replace the full
  application test job, which stays intact.
- The every-push trigger change (Step 1, done) makes all of these — plus the whole existing gate —
  run on every push, which is the core assignment requirement.

### Skill validator contract (start lean)

One zero-dependency Node CLI at `scripts/skills-gate.mjs` (mirrors `arch-gate.mjs`), with modes
`structure`, `sync`, and `all`. It **discovers the inventory dynamically** (never hardcodes 20) and
**does not** judge semantic usefulness, triggering, factual quality, or external links (that's
`skill-evaluation`, kept separate). It never calls Claude.

**Structure mode blocks on** (confirmed against the real skills — all 20 already pass these):
- missing or empty `SKILL.md`;
- malformed frontmatter, or missing `name` / `description` / `metadata` / `metadata.version`;
- `name` not kebab-case, duplicated, or not matching its folder;
- angle brackets in frontmatter; `description` over 1,024 characters;
- `metadata.version` not numeric `major.minor[.patch]`;
- missing required sections — **matched by role, not exact title**: an Intent section, a
  "Checklist before calling … done" section, a "When unsure" section, and a "Based on" section.

**Explicitly NOT enforced** (would false-fail real skills):
- ~~per-skill `README.md`~~ — none exist; SKILL.md is the source of truth.
- exact section *titles* (they vary per skill, e.g. "Core rules (mapped to OWASP…)" vs
  "Writing tests — follow the testing pyramid") — match the section's role, not its wording.
- strict section *ordering* is a soft check (warn), not a hard block, unless we confirm all 20 share
  one order.

**Library-sync mode blocks on:**
- a real skill with no matching entry in `SKILLS-LIBRARY.md`;
- an index entry with no matching real skill;
- duplicate entries; wrong/missing canonical skill links.
- Planned/placeholder entries (if any are marked as not-yet-built) do not require files.

**Fixtures:** under `scripts/fixtures/skills-gate/` **only**, never the real `.claude/skills/` tree.
Use Node's built-in test runner; assert exit status + stable diagnostic code.

### BDD job inputs (reverify filenames on the branch before wiring)

- **Policy seed (F1.1):** `policy-seed.test.ts`, `policy-seed-spec.test.ts`,
  `policy-generator.test.ts`, `policy-seed-validate.test.ts`, `policy-seed-actions.test.ts`.
- **Active-policy inheritance (F1.3):** `pipeline-policy-context.test.ts` (+ relevant policy coverage).
- **Co-Pilot safety (F4.1/F4.2/F4.4, F5.1 slice):** `copilot.test.ts`, `copilot-grounding.test.ts`,
  `guardrails.test.ts`, relevant `standards.test.ts`.

Add new `studio/` acceptance tests **only** for confirmed gaps and **only after coordinating with
active lane owners** (Lanes A–D are editing `studio/`).

### Scope boundaries (keep honest)

- Do not claim full browser/production proof from domain tests.
- Do not claim Release 1b PII/minimization or full human-approval as shipped Week 5 evidence.
- Do not claim MMP Workflows or Justice Layer coverage.
- **Do not add a superficial accessibility check to pad the count.** Manual QA covers visible,
  responsive, focus, keyboard, comprehension, and trust observations for this assignment; a credible
  automated a11y gate is a later decision. (Matches §17 of the lecture reference.)
- Do not call Claude in the structural gate; semantic Skill evaluation stays separate.

### Known coverage gaps (stay labeled honest)

- **PS-4:** resume after interrupted policy intake.
- **PI-3:** edited rule applies to the next run with no redeploy.
- **CP-7:** out-of-scope Co-Pilot question points to a human.
- **CP-8:** complete Co-Pilot persistence is partial, not a confirmed full boundary test.
- **PS-5:** existing-policy upload is outside the confirmed Release 1a Week 5 gate.

## Build sequence

> **Commit cadence (Val's rule):** batch the work — **one or two commits per work session**, with
> ticket moves alongside — rather than a commit per phase. Phases are a work *order*, not a
> commit rule. Val commits/pushes/opens PRs in GitHub Desktop; Claude leaves changes uncommitted.
> Everything stays in this worktree and avoids `studio/` feature code the lanes are editing.

### Phase 0 — Restore a trusted green baseline *(done)*

1. ✅ Confirmed `main` CI was genuinely **red** (run #111) at `next build` — flaky `next/font/google`
   fetch, not an offline artifact.
2. ✅ Root-caused and fixed: self-hosted Roboto via `@fontsource/roboto` (**ADR-0017**).
3. ✅ Verified locally — full gate green (lint, format, types, 122 tests, build); prod audit clean.
4. ⬜ Record the first **green CI run URL + SHA** in `CI-EVIDENCE.md` once this is pushed.

**Exit:** a reliable, deterministic build; green baseline recorded after push. No gate weakened.

### Phase 1 — Land the ADR and confirm the widened triggers *(done)*

1. **Triggers already widened** this session in `ci.yml` + `arch-gate.yml` (`push:` unrestricted +
   `pull_request` → `main`, with a `concurrency` guard). Confirm they fire on a branch push.
2. Add **ADR-0016** at `docs/adr/0016-week-5-ci-safety-gates.md` (status **Proposed**); add it to
   `docs/adr/README.md`; leave ADR-0006 Accepted and unchanged.

**Exit:** non-`main` branch-push run URLs for CI and the Architecture Quality Gate; ADR-0016 in repo.

### Phase 2 — Implement and test the two Skill gates *(done)*

1. Add `scripts/skills-gate.mjs` (lean contract above).
2. Add fixtures under `scripts/fixtures/skills-gate/` + Node built-in tests.
3. Run `structure` and `sync` against all real skills; fix only genuine defects — never loosen the
   contract to hide a real failure.
4. Add local npm commands.
5. Add separately named **Claude Skills — Structure** and **Claude Skills — Library sync** jobs.

**Exit:** fixtures prove expected failures locally; both real-library jobs green and visible by name.

### Phase 3 — Add the BDD-acceptance check *(done)*

1. Reverify the evidence table against the branch.
2. Add one **BDD acceptance (Release 1a)** job with three named steps (Policy seed · Active-policy
   inheritance · Co-Pilot safety).
3. Keep the full application test job intact; confirm all pre-existing tests remain green.
4. Preserve Partial/Gap labels until acceptance-level evidence exists.
5. Update `CI-EVIDENCE.md` with exact job/step names and the first green run.

**Exit:** three new named Week 5 checks + all pre-existing gates green on a branch push.

### Phase 4 — Prove controlled red and green recovery *(done — run #13 red → #15 green)*

1. From the known-green implementation commit, create a **separate disposable** branch, e.g.
   `proof/week5-skill-gate-red-green`.
2. Blank `metadata.version` in one otherwise-valid skill.
3. Commit only that one-file break; push.
4. Confirm **Claude Skills — Structure** alone fails with `REQUIRED_FIELD_MISSING`; other jobs green.
5. Capture branch, SHA, run URL, failing job, diagnostic, non-sensitive excerpt.
6. Revert on the same proof branch; push; capture the green recovery SHA + URL.
7. Never open a PR from or merge the proof branch; delete it after evidence is recorded.

**Exit:** real red + green Actions evidence, with no invalid commit in implementation history.

### Phase 5 — Open the PR, verify, merge *(done — PRs #63/#64/#65)*

1. Add `Week 5 Coding Challenge/SUBMISSION.md` and `CI-EVIDENCE.md` to the branch.
2. Open the PR with the BDD table, ADR-0016, and red/green evidence.
3. Confirm all existing + three new checks are green.
4. Review the diff for unrelated `studio/` collisions with the lanes.
5. Flip ADR-0016 to **Accepted** only if the implementation matches the decision.
6. Merge only while green.

**Exit:** PR URL, merge SHA, green required checks recorded.

### Phase 6 — Verify deployment and run manual QA

1. Confirm Vercel deploys the exact merge SHA.
2. Run **Manual Case 1** (policy seed + activation) on the live app with fictional data.
3. Run **Manual Case 2** (Co-Pilot consequential-use flow) on a phone / ~390×844 viewport with the
   fixed fictional prompt.
4. Personally record every actual result, pass/fail, environment, elapsed time, comprehension/trust
   judgment, and bug link.
5. Preserve failures; create reproducible bug tickets; do not rewrite results to pass. Retest fixes
   as separate runs.
6. Final live smoke check.

**Exit:** successful deployment, two genuine completed manual records, final live-app evidence.

### Phase 7 — Finalize and submit

1. Replace every pending placeholder in the Notion + repository submission documents.
2. Add final repo links for `SUBMISSION.md`, `CI-EVIDENCE.md`, ADR-0016.
3. Recalculate the BDD coverage summary if new tests changed any judgment.
4. **Valeriya** writes ≥2 paragraphs for each reflection section **without AI**.
5. Remove placeholders; verify every link opens and no evidence contains secrets/real sensitive data.
6. Email the completed submission by November 23, 2026.

## Kanban mapping

> The three former per-dimension BDD *checks* are now **steps inside one BDD job**. The three Notion
> BDD tickets (Policy Seed / Policy Inheritance / Co-Pilot Safety) are best kept as the
> **traceability work** behind that one job — recommend relabeling them in Notion as sub-tasks of
> "Add BDD acceptance check" rather than three separate CI jobs.

| Seq | Ticket | Status | Completion evidence |
| ---: | --- | --- | --- |
| 1 | Confirm a trusted green CI baseline | Requirements | Green `main` SHA + Actions run URL |
| 2 | Run CI on every branch push + record decision | **Partly done** | Triggers widened (this session) + ADR-0016 + non-main run |
| 3 | Add Claude Skills **Structure** gate | Requirements | Validator, fixtures, named green job |
| 4 | Add Claude Skills **Library-sync** gate | Requirements | Sync fixtures + named green job |
| 5 | Map Week 2 BDD → automated/manual coverage | In Progress | Draft complete; final run URLs/gaps pending |
| 6 | Add **BDD acceptance** check (3 named steps) | Requirements | One named green job, 3 steps |
| 7 | Demonstrate intentional CI failure + green recovery | Requirements | Proof-branch red + green URLs/SHAs |
| 8 | Run manual QA: policy seed + activation | In Progress | Personally completed live result table |
| 9 | Run manual QA: Co-Pilot consequential-use flow | In Progress | Personally completed mobile result table |
| 10 | Merge, verify deployment, assemble submission evidence | Requirements | PR, merge, Vercel, final docs + links |

## Artifact map

| Artifact | Repo location (target) | State |
| --- | --- | --- |
| Lecture reference | [`docs/reference/week-5-qa-cicd.md`](week-5-qa-cicd.md) | Complete |
| This build plan | `docs/reference/week-5-cicd-build-plan.md` | Current (supersedes the Desktop draft) |
| ADR-0016 | `docs/adr/0016-week-5-ci-safety-gates.md` | To add (Proposed); adapt from Codex draft to our ADR format |
| Skill validator | `scripts/skills-gate.mjs` (+ `scripts/fixtures/skills-gate/`) | To build |
| CI evidence | `Week 5 Coding Challenge/CI-EVIDENCE.md` | To add (scaffold) |
| Submission | `Week 5 Coding Challenge/SUBMISSION.md` | To add (scaffold; reflections blank for Val) |
| Manual QA | [Notion combined doc](https://app.notion.com/p/419975c3b9508092b12bde20dc6fcef8) | Prepared, not executed |

## Ownership

| Work | Owner |
| --- | --- |
| Workflows, validator, fixtures, tests, ADR, build sequence | Claude + Val (Claude edits; Val commits in GitHub Desktop) |
| Planning, traceability, evidence scaffolding | Val (with Claude / earlier Codex prep) |
| Live execution of both manual cases + all actual-result judgments | Valeriya |
| "What I Did" and "What I Learned" | **Valeriya only** |
| Final merge, live verification, placeholder removal, email | Valeriya |

## Risks and controls

| Risk | Control |
| --- | --- |
| Flaky build red-fails CI unpredictably | **Resolved** — self-hosted Roboto (ADR-0017) removes the build-time Google Fonts fetch; verified green locally + 0 prod-audit vulns |
| **Validator too strict → false-fails good skills** | Start lean (CLAUDE.md DoD); match sections by role not title; no README requirement; confirm all 20 pass before adding rules |
| Existing checks presented as new Week 5 work | Name the **3** new jobs separately; retain the full pre-existing gate |
| A green result overstates coverage | Keep Covered/Partial/Gap/Out-of-scope labels; state each boundary |
| Skill structure confused with semantic quality | Deterministic validation stays separate from model-based skill evaluation |
| "Every push" interpreted narrowly | Capture a real non-`main` branch-push run before the PR |
| Proof commit enters `main` history | Separate disposable proof branch; no PR/merge |
| Fixtures pollute the real skill inventory | Store only under `scripts/fixtures/skills-gate/` |
| Active `studio/` work overwritten | Front-load repo-level changes; coordinate before adding acceptance tests |
| No-AI reflection rule violated | Keep both reflection sections blank for Valeriya |
| Sensitive data in tests/evidence | Fixed fictional inputs; redact screenshots/log excerpts |

## Source set

- [Week 5 assignment](https://app.notion.com/p/419975c3b95080f0a292c64c8ad84a72)
- [CI/CD how-to](https://app.notion.com/p/419975c3b95080ed8a0ad519abb04d2d)
- [Week 2 User Requirements](https://app.notion.com/p/406975c3b9508040a701eb4106cf942a)
- [Week 2 Technical Requirements](https://app.notion.com/p/406975c3b95080b2bffadda2ada6d007)
- Lecture capture: [`docs/reference/week-5-qa-cicd.md`](week-5-qa-cicd.md)
- [Repository Actions history](https://github.com/ValeriyaMetla/AI-Development-Residency/actions)
