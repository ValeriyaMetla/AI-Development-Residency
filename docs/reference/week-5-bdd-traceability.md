# Week 5 — BDD → test traceability (Release 1a)

> **What this is.** The map from our Week-2 **BDD scenarios** (the *Given/When/Then* in
> [Technical requirements](https://app.notion.com/p/406975c3b95080b2bffadda2ada6d007)) to the
> **automated tests** that exercise them, plus honest coverage labels. It backs the Week-5
> **BDD acceptance (Release 1a)** CI check (ADR-0016), whose three named steps run the mapped
> Vitest files. The full suite still runs in the `App checks (studio)` job; these steps are a
> requirement-to-check view, not a replacement.
>
> **Coverage labels** are at the scenario level: **Covered** = the path has a corresponding test;
> **Partial** = touched but not fully asserted; **Gap** = no automated test yet (candidate for a
> manual test or a follow-up); **Out-of-scope** = deferred past the Release-1a Week-5 gate.

## CI steps → test files

| Named CI step | Source features | Test files (Vitest filter) | Tests |
|---|---|---|---|
| **BDD — Policy seed (F1.1)** | F1.1 | `policy-seed`, `policy-seed-spec`, `policy-seed-validate`, `policy-seed-actions`, `policy-generator` | 41 |
| **BDD — Active-policy inheritance (F1.3)** | F1.3 | `pipeline-policy-context` | 2 |
| **BDD — Co-Pilot safety (F4.1/F4.2/F4.4, F5.1 slice)** | F4.1, F4.2, F4.4, F5.1 | `copilot`, `copilot-grounding`, `guardrails`, `standards` | 40 |

## Scenario-level traceability

### Epic 1 — Policy (F1.1 seed, F1.3 inheritance)

| # | Scenario (Given/When/Then, abbreviated) | Evidence | Coverage |
|---|---|---|---|
| PS-1 | *Happy* — new org finishes seed → plain-language draft, each rule grounded | `policy-generator`, `policy-seed-spec` | ✅ Covered |
| PS-2 | *Edge (skip)* — skipped optional question → labeled safe default | `policy-seed-validate`, `policy-seed-spec` | ✅ Covered |
| PS-3 | *Edge (validation)* — malformed answers rejected (zod) | `policy-seed-validate`, `policy-seed-actions` | ✅ Covered |
| PS-4 | *Edge (resume)* — leave mid-intake → saved answers resume | — | ⚠️ Gap *(no automated test; UI/state — candidate for manual QA)* |
| PS-5 | *Edge (existing policy)* — upload existing policy → draft assesses it | — | ⛔ Out-of-scope *(not in the Release-1a Week-5 gate)* |
| PI-1 | *Happy* — active policy → current rules enforced on each run | `pipeline-policy-context` | ✅ Covered |
| PI-2 | *Happy* — run with no active policy handled (409 precondition) | `pipeline-policy-context`, `policy` | ✅ Covered |
| PI-3 | *Edge* — edited rule applies on the next run with no redeploy | `pipeline-policy-context` (reads current policy) | 🟡 Partial *(inheritance proven; the "no redeploy after an edit" path needs an acceptance test)* |

### Epic 4/5 — Co-Pilot safety (F4.1, F4.2, F4.4) + rule-check (F5.1 slice)

| # | Scenario (abbreviated) | Evidence | Coverage |
|---|---|---|---|
| CP-1 | *Happy* — described use → clear recommendation (use / conditions / don't) + plain reasons | `copilot` | ✅ Covered |
| CP-2 | *Edge (risky)* — use conflicting with policy/law → advises against, with why | `copilot` | ✅ Covered |
| CP-3 | *Risk-tiering is deterministic code*, not a model verdict (ADR-0010) | `copilot` | ✅ Covered |
| CP-4 | F4.2 *Happy* — risky use → concrete safer alternative (`saferWay`) | `copilot` | ✅ Covered |
| CP-5 | F4.2 *Edge* — no safe version → clear "don't" + why | `copilot` | 🟡 Partial |
| CP-6 | F4.4 — recommendation cites a baseline `standard_rule` (NIST/EU/ISO) | `copilot-grounding`, `standards` | ✅ Covered |
| CP-7 | F4.1 *Edge (out-of-scope)* — question it can't answer → says so, points to a human | — | ⚠️ Gap |
| CP-8 | Assessment persisted + audited (`copilot_assessment`, audit event) | `copilot` | 🟡 Partial |
| RC-1 | F5.1 *Happy* — task checked against active policy before output | `guardrails` | ✅ Covered |
| RC-2 | F5.1 *Edge* — violation → `status:"blocked"` + plain reason (no Claude call) | `guardrails` | ✅ Covered |

**Summary:** 16 scenarios — **10 Covered · 4 Partial · 1 Gap (+1 resume gap) · 1 Out-of-scope.** The
partial/gap rows are stated honestly and are **not** claimed as full end-to-end proof. Release-1b
PII/minimization and full human-approval behavior, and MMP Workflows/Justice-Layer behavior, are
**not** claimed as Week-5 passing evidence.

## What the manual tests cover (what automation can't — §17 of the lecture)

The two hand-run test cases on the live app cover the human-only column: a **Co-Pilot
consequential-use UX flow** (does the recommendation read clearly and point to a human when it
should — touches CP-7) and a **policy-seed + activation walk-through** (the end-to-end flow and
resume behavior — touches PS-4). Results are recorded in the Test Case Scenario template.
