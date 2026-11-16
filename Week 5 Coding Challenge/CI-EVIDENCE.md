# Week 5 — CI/CD Evidence

> Evidence that the Week 5 CI/CD pipeline runs on every push, derives its checks from the Week-2
> MVP requirements, gate-checks the Week-1 Claude Skills, and that a broken push is caught (red)
> and recovers (green). Decisions: [ADR-0016](../docs/adr/0016-week-5-ci-safety-gates.md) (CI
> safety gates) and [ADR-0017](../docs/adr/0017-self-host-roboto-font.md) (build-reliability fix).
>
> **Repository:** https://github.com/ValeriyaMetla/AI-Development-Residency ·
> **Live app:** https://ai-development-residency-nine.vercel.app ·
> **Actions:** https://github.com/ValeriyaMetla/AI-Development-Residency/actions

## 1. The pipeline (runs on every push)

Three GitHub Actions workflows, each triggered on **every push (any branch)** and on PRs into `main`:

| Workflow | File | Checks |
|---|---|---|
| **CI** | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | App checks (ESLint · Prettier · tsc · Vitest · `next build` · prod `npm audit`) · **BDD acceptance (Release 1a)** · Secret scan (gitleaks) |
| **Architecture Quality Gate** | [`.github/workflows/arch-gate.yml`](../.github/workflows/arch-gate.yml) | Deterministic layering scan (`scripts/arch-gate.mjs`) |
| **Claude Skills Gate** | [`.github/workflows/skills-gate.yml`](../.github/workflows/skills-gate.yml) | **Claude Skills — Structure** · **Claude Skills — Library sync** · gate self-tests |

## 2. The 3 new checks (derived from the Week-2 MVP requirements)

| New named check | Derived from | Proves |
|---|---|---|
| **Claude Skills — Structure** | Week-1 Skills + Week-5 requirement | every `.claude/skills/<name>/SKILL.md` is well-formed (frontmatter, name/folder identity, ≤1024-char description, required sections) |
| **Claude Skills — Library sync** | `docs/SKILLS-LIBRARY.md` DoD | the 20 real Skills and the library index agree (no drift) |
| **BDD acceptance (Release 1a)** | Week-2 BDD F1.1 / F1.3 / F4.1–F4.4 (F5.1 slice) | the mapped tests pass, as named per-dimension steps ([traceability](../docs/reference/week-5-bdd-traceability.md)) |

(A gate self-test job also runs the validator against malformed fixtures to prove it catches breakage.)

## 3. Run evidence

| What | Result | Reference |
|---|---|---|
| **Baseline was red** (flaky `next/font` build) | ❌ CI #111 | commit `1e7dde7` — `next build` failed in the `next/font` Google loader |
| **Build fixed** (self-host Roboto, ADR-0017) | ✅ CI #119 | PR #63 merge `f02f93e` |
| **Skill gate live + green on main** | ✅ Claude Skills Gate #3 | PR #64 merge `219aa22` (and branch-push run #1, `29dd1fc`) |
| **3rd check green on main** | ✅ CI #130 | PR #65 merge `ce76803` — https://github.com/ValeriyaMetla/AI-Development-Residency/actions/runs/43798379386 |
| **Runs on every push** | ✅ | CI / Arch Gate / Skills Gate all ran on non-`main` branch pushes |
| **No branch protection** | ✅ (free plan) | merge decision is a documented human step |

## 4. Broken push → caught (red) → recovered (green)

On a disposable branch `proof/week5-skill-gate-red-green` (never merged):

| Step | Result | Reference |
|---|---|---|
| Blanked `documentation`'s `metadata.version`, pushed | 🔴 **Claude Skills — Structure FAILED** with `REQUIRED_FIELD_MISSING` (only that check) | run #13, commit `7c57741` — https://github.com/ValeriyaMetla/AI-Development-Residency/actions/runs/43799018859 |
| Restored the version, pushed | 🟢 **all checks green** | run #15, commit `b850a44` |

CI log excerpt (red):
```
Run node scripts/skills-gate.mjs structure
REQUIRED_FIELD_MISSING  .claude/skills/documentation/SKILL.md: missing non-empty "metadata.version"
Claude Skills — Structure: FAIL (1 problem)
Error: Process completed with exit code 1.
```

## 5. Manual QA (run by hand on the live app)

Two test cases are designed in [`manual-test-cases.md`](manual-test-cases.md). Results (pre-conditions,
steps, expected, **actual**, pass/fail) are recorded there by Valeriya after running them live.

| Test case | Use case | Status |
|---|---|---|
| MT-1 — Co-Pilot consequential-use flow | F4.1 / F4.2 (`/copilot`) | ⬜ to be run on the live app |
| MT-2 — Policy seed + activation walk-through | F1.1 / F1.3 | ⬜ to be run on the live app |

## 6. Live app

- Vercel deploys `main` on every merge; current `main` is `ce76803`.
- Final live-app smoke check: ⬜ *(confirm the app loads and a core flow works after the merges)*.
