# Weeks 5 & 6 recap — what I built, did, and learned (after Release 1a → 2026-11-24)

> **What this is.** A plain-language map of everything that happened between the Release 1a launch
> (≈ 2026-11-15) and today, gathered from the git history on `main`, the ADRs in `docs/adr/`, the
> handover log, and the Week 5 / Week 6 evidence files. It is a **memory aid** so I can write my own
> homework reflections — not text to paste in. (Both `SUBMISSION.md` "What I Did / What I Learned"
> sections must be in my own words, no AI.)
>
> **How it's organised:** ① the big picture · ② Week 5 homework (QA / CI/CD) · ③ product build —
> Release 1b · ④ the UX/UI work · ⑤ Week 6 homework (Security) · ⑥ fixing the PenTest findings ·
> ⑦ mistakes and what they taught me · ⑧ what's still open · ⑨ glossary.

---

## ① The big picture in one screen

| Stream | What it means in plain words | Where to look |
|---|---|---|
| **Week 5 — QA / CI/CD** | Set up robots that check my code every time I push, and wrote manual tests a person runs by hand. | `.github/workflows/`, `Week 5 Coding Challenge/` |
| **Release 1b build** | Turned the one-hero-feature MVP (Co-Pilot) into a fuller product: run governed AI tasks, a safety net, human review, monitoring, an audit trail, a living policy, onboarding. | `studio/app/`, `studio/lib/`, `docs/handovers/release-1b-build-outline.md` |
| **UX/UI improvements** | Redesigned the landing page, sign-in, the menu, the home screen; added a no-login demo, a data page, an FAQ; fixed confusing screens found in a UX audit. | `studio/app/components/landing/`, `studio/app/demo/`, `studio/app/your-data/` |
| **Week 6 — Security** | Wrote a research report + deck on securing the Service layer, then *attacked my own app* (a PenTest) and found 22 problems. | `security/` |
| **PenTest fixes** | Fixed the findings one group at a time and re-tested each fix on two databases. | `security/pentest-evidence/retest-*.md`, ADR-0028 → ADR-0040 |
| **Skills** | Built/upgraded the Claude Skills I used for this work. | `.claude/skills/` |

**By the numbers (from the repo, 2026-11-24):**
- ADRs went from **ADR-0015 → ADR-0040** — 26 new recorded decisions in about 9 days.
- Pull requests merged on `main`: roughly **#59 → #151**.
- Test files in `studio/test/`: **82**. Test count grew from ~230 (2026-11-18) to **650** (2026-11-22, per the handover log).
- PenTest: **22 findings** (2 High, 6 Medium, 13 Low, 1 Pass). By today every one except F-13 (no fix needed) has a fix merged; most are re-tested (details in ⑥).

---

## ② Week 5 homework — QA, CI/CD and testing

**The idea in plain words:** *CI* (continuous integration) means every time I push code to GitHub, a
set of automatic checks runs. If one fails, it turns red and I know something broke *before* it
reaches real users. *CD* (continuous deployment) means when code is merged to `main`, Vercel
publishes it to the live site automatically.

### What I built

**1. Three (later five) automated check "workflows"** — all in `.github/workflows/`:

| Workflow file | What it checks, in plain words |
|---|---|
| `ci.yml` → **App checks** | Code style (ESLint, Prettier), type errors (`tsc`), all unit tests (Vitest), that the app builds (`next build`), and that no installed package has a known serious security hole (`npm audit`). Later also the database-permission security tests (see ⑥). |
| `ci.yml` → **BDD acceptance (Release 1a)** | Runs the tests that prove the Week 2 acceptance criteria (policy seed F1.1, policy inheritance F1.3, Co-Pilot safety F4.x) as named steps. |
| `ci.yml` → **Secret scan (gitleaks)** | Makes sure no password or API key was accidentally committed. |
| `arch-gate.yml` | My architecture rule-checker (`scripts/arch-gate.mjs`): e.g. "screens must not talk to the database directly." |
| `skills-gate.yml` **(new in Week 5)** | Checks every Claude Skill file is well-formed and that the catalog in `docs/SKILLS-LIBRARY.md` matches the real skills (`scripts/skills-gate.mjs`). It even has a self-test that feeds it broken examples to prove it catches them. |
| `codeql.yml` *(added in Week 6)* | GitHub's code scanner that looks for security bugs in the code. |

**2. Proof the gate works — red → green.** On a throwaway branch I deliberately broke a skill file
(blanked a version number), pushed, watched **only** the Skills Structure check go red, then fixed it
and watched everything go green. Recorded in `Week 5 Coding Challenge/CI-EVIDENCE.md` §4.

**3. A fix for a flaky build.** The build sometimes failed because it downloaded the Roboto font from
Google during the build. I switched to storing the font inside the project
(**ADR-0017 — self-host Roboto**). Baseline was red (CI #111), fixed green (CI #119).

**4. Manual test cases.** Two scripted tests a human runs on the live site, in
`Week 5 Coding Challenge/manual-test-cases.md`: MT-1 Co-Pilot flow and MT-2 policy-seed walk-through.
Both were run on 2026-11-22 and **passed 11/11 steps** (the policy seed took 2 min 31 s in that
automated run — a real person will take longer).

**5. Traceability.** `docs/reference/week-5-bdd-traceability.md` maps each BDD scenario from the Week 2
spec to the exact test that proves it.

**6. Node 22 upgrade.** Moved the toolchain and CI from Node 20 to Node 22 (**ADR-0019**), and added
`npm run verify` — one command that runs the whole gate locally (`scripts/filter-noise.mjs` hides one
harmless warning without hiding real failures).

**7. A product feature that came out of Week 5:** the **self-critique pass** (**ADR-0015**) — after
the AI drafts something, a second "challenger" pass checks the draft (e.g. tone) before the person
sees it. Files: `studio/lib/domain/self-critique.ts` + its test.

### Decisions recorded
- **ADR-0016** — Week 5 CI safety gates (CI stays *credential-free*: no real database or keys inside CI).
- **ADR-0017** — self-host the Roboto font.
- **ADR-0019** — move to Node 22.

### Week 5 skill work
- New skill **`ci-cd-pipeline`** (how to design a good CI gate).
- New skill **`skill-authoring`** (the shape of a skill file).

### Submission files
`Week 5 Coding Challenge/SUBMISSION.md` (links filled; my two reflection sections still to write),
`CI-EVIDENCE.md`, `manual-test-cases.md`, plus the lecture notes `docs/reference/week-5-qa-cicd.md`
and plan `docs/reference/week-5-cicd-build-plan.md`.

---

## ③ The product build — Release 1b

Release 1a shipped the **Governance Co-Pilot** (the "should we use AI for this?" check). Release 1b
built the rest of the governed-AI journey. The Notion board had **~52 cards** in 5 "chunks"; the
plan lives in `docs/handovers/release-1b-build-outline.md`. I worked in parallel **"lanes"** (A, B, C,
D) — separate chats and branches building different areas at the same time.

### Chunk 1 — the Doer's core experience (Epic #3) ✅
- **Shared app shell** — one consistent layout, menu, account menu, skip-link, accessible colours
  (`studio/app/components/app-shell.tsx`, route group `studio/app/(app)/`).
- **Governed Skill runner** at `/skills` — a staff member ("Doer") runs an approved AI task (first one:
  *Draft a thank-you*). Each run goes draft → self-critique + tone check → rule check → a label
  showing how it was made. Files: `lib/domain/pipeline.ts`, `lib/domain/skills.ts`.
- **"Rules that apply here"** panel inside the runner, with the source standard cited.
- **Role-aware home and menu** — a Leader and a Doer see different first steps (`app/components/nav.ts`).
- **No policy yet? Still safe** — a baseline safety net always applies (**ADR-0018**).

### Chunk 2 — the safety net (Epic #5) ✅
- **Personal-details (PII) safety net** — detects emails, phone numbers, SSNs, card numbers and
  removes them *before* the AI sees them or anything is stored; a person can deliberately keep one,
  and that choice is logged (`lib/domain/pii.ts`).
- **Risky-use flagging** — tasks that look like a decision about a person, or medical/legal/benefits/
  safety topics, are routed to human review (`lib/domain/risky-use.ts`).
- **Human-approval gate** — flagged runs wait at `/approvals` for a person (**ADR-0020**). Approving
  needs a tick-box acknowledgement (no rubber stamp). A reviewer can edit the draft; the AI original
  is kept and the edit is marked (**ADR-0022**).
- **Correction flow** — someone can add a correction/note to a past entry (**ADR-0021**).

### Chunk 3 — monitoring / the registry (Epic #2) ✅
- `/dashboard/usage` — totals by type, by week, and how often the safety net caught something — **no
  content shown**, only counts.
- `/dashboard/usage/mine` — each person can see their own entries (framed as transparency, not
  surveillance).

### Chunk 4 — the living policy (Epics #1/#2/#4) ✅ (one manual check left)
- **Rule editor** — a Leader edits rules; every edit publishes a **new version**, never overwrites
  (**ADR-0024**). Safety-floor rules are locked.
- **Rule suggestions** — after the same risky pattern shows up 3+ times, the app suggests a new rule
  the Leader can accept or dismiss (**ADR-0025**, spec `docs/specs/epic-1-rule-suggestion-logic.md`).
- **Export + re-import policy** (backup file) and a **readable policy document** at
  `/policy-seed/document` with Print / Save as PDF; rules re-worded in one "we" voice.
- **If the policy can't be loaded**, the run still uses baseline safety but says so and forces human
  review (**ADR-0027**) — instead of silently acting as if there were no rules.

### Chunk 5 — coach, report, onboard (Epics #6/#7/#8) ✅
- **In-the-moment coaching** (Epic #6) — a friendly nudge with a "use the safer way" rewrite, or
  dismiss; crisis-type topics point to a person instead (`lib/domain/coaching.ts`).
- **Audit trail + Governed AI Summary** (Epic #7) at `/report`, with one-click PDF. Audit entries
  can't be edited, deleted or forged (**ADR-0026**, later strengthened by ADR-0039).
- **Onboarding** (Epic #8) — `/setup` self-serve setup hub, "Use recommended answers" fast path,
  resume a half-finished draft, "Run your first Skill →".
- **Free tier vs premium** — the full safety net is always free; premium only adds capacity
  (**ADR-0023**).
- **Co-Pilot clarity** — a blank form can no longer return "go ahead" (you must confirm "none of
  these apply"), and each question has a one-line plain explanation.

**Status:** MVP #1 / Release 1b is functionally complete. The *Verify the 5-minute promise* card was
the last manual item (the MT-2 manual test timed the flow at 2 min 31 s in an automated run).

---

## ④ The UX/UI work (Epic #8 + redesign)

| What | Where | Notes |
|---|---|---|
| **Landing page** — hero, How it works, safety net, who it's for, standards, free tier, CTA; then a **redesign so each section has its own layout** | `studio/app/components/landing/` | Built from an approved wireframe; copy kept honest (no overclaiming). |
| **Sign-in / sign-up redesign** — split branded layout | `app/components/auth/`, `auth-content.ts` | Commit `9c6eccb`. |
| **Menu grouped under "Your AI Governance"** — Co-Pilot → AI Policy → Human Review → Monitoring → Audit Trail; headings renamed to standards-style names | `app/components/nav.ts` | Commit `914f427`. Routes unchanged. |
| **Leader home shows the governance lifecycle** as numbered steps | `app/(app)/dashboard/` | PR #97. |
| **Policy review screen made honest** — "🔒 Safety floor — always on", "Needs review" only where you can actually change it | `policy-seed` | PR #95. |
| **No-login demo** at `/demo` — fictional *Riverbend Community Pantry*, AI faked, nothing saved, cannot touch real data | `studio/app/demo/`, `studio/lib/demo/` | **ADR-0029**. PRs #103–#113. |
| **"How we handle your data" page** at `/your-data` + **FAQ** + shared **footer** | `studio/app/your-data/`, landing | Each claim tied to code by an "honesty test". |
| **UX audit (2026-11-23)** found 5 Must gaps; fixed so far: reviewers now see *why* a Co-Pilot item was flagged (PR #128); leaders see what's waiting for review on Home + menu (PR #136); "Forgot password?" flow (PR #146); reviewer rule never reads "myself reviews" (PR #134); team-promise copy made true until invites exist (PR #142). | various | 8 "Should" UX items ticketed for later (404 pages, mobile nav, loading states, date format…). |

---

## ⑤ Week 6 homework — Security

**The idea in plain words:** first *learn* how to protect one part of an app (the research report),
then *attack my own app* like a hacker would, write down everything that broke, rank it, and say how
to fix it (the PenTest).

### What I produced
| Deliverable | File |
|---|---|
| Study guide for the lecture | `docs/reference/week-6-security.md` |
| **Security Research Report — the Service layer** (~2,930 words) | `security/service-layer-research-report.md` |
| **Slide deck** for the report | `security/Securing the Service Layer PPT.pptx` |
| **PenTest Report** — threat model, audit table, findings, recommendations, BDD, security requirements | `security/pentest-report.md` (export) — live version is the Notion page |
| Redacted evidence | `security/pentest-evidence/` (subfolders `ai/`, `app/`, `db/`, `prod/`) |

### How the PenTest was run (plain words)
1. **Permission and scope first** — wrote down what I was allowed to test and what was off-limits.
2. **A separate test database** — a copy project called **`studio-pentest`** with 4 fake accounts
   (Org A and Org B, each with a leader and a frontline member), so I never attacked real data.
3. **Threat model** — drew the system, listed what must be protected (C1–C8) and what could go wrong
   (T1–T15), ranked by likelihood × damage.
4. **Audit table** — ~62 checks across every layer (Presentation, Service, Domain, Data Source,
   Database), each Pass/Fail with evidence. Also a section on how Wireshark could be used.
5. **Prompt-injection tests** against the AI (evidence in `pentest-evidence/ai/`).
6. **Findings → Recommendations (R1–R20) → BDD scenarios → Security requirements (SR-01–SR-24).**

### The 22 findings, translated
| ID | Severity | Plain meaning |
|---|---|---|
| **F-01** | P1 High | A staff member could mark a run "approved" themselves, skipping human review. |
| **F-02** | P1 High | No limit on AI calls — someone could run up the AI bill. |
| F-03 | P2 | Any member (not just a leader) could switch the active policy. |
| F-04 | P2 | Weak passwords allowed and no lockout after many wrong tries. |
| F-05 | P2 | Sessions never ended; the login cookie was readable by scripts. |
| F-06 | P2 | No protection against the site being embedded in a fake page (clickjacking); no content security policy. |
| F-07 | P2 | Unlimited fake sign-ups; 5,000-character names accepted. |
| F-20 | P2 | Hidden instructions could be smuggled to the AI inside policy text (prompt injection). |
| F-08 | P3 | Importing a policy file could drop the safety-floor rules. |
| F-09 | P3 | Missing safety headers; the site advertised which framework it uses. |
| F-10 | P3 | Sign-up revealed whether an email already had an account. |
| F-11 | P3 | Policy-wizard answers stayed in the browser after logout. |
| F-12 | P3 | An unused login method was switched on; password changes didn't need re-login. |
| F-14 | P3 | A user could write a fake audit entry for something that never happened. |
| F-15 | P3 | The Claude call had no time limit; AI text length wasn't checked. |
| F-16 | P3 | Known-vulnerable packages in test tooling. |
| F-17 | P3 | CI had no code scanning or permission tests. |
| F-18 | P3 | Policy activation wasn't all-or-nothing — a failure could leave no active policy. |
| F-19 | P3 | Direct database access open to all IPs, no forced SSL or logging. |
| F-21 | P3 | Approval gaps — unflagged runs could be approved; decisions could be overturned. |
| F-22 | P3 | No record or alert for failed sign-ins and refused access. |
| F-13 | Pass | Logged-out visitors have no table access on live. |

### Week 6 skill work
- **`secure-coding` → v2.0** (updated to OWASP Top 10:2025).
- New skill **`security-testing` v1.0** — evaluated 19/19 with the skill vs 9/19 without.
- **`pitch-deck` v1.1** — added an "explainer" mode so it could build a teaching deck, not only a
  persuasion deck.

---

## ⑥ Fixing the PenTest findings

**The method I used for every group** (from `docs/handovers/week-6-pentest-fixes-handover.md`):
explain options → I pick → ADR if hard to reverse → build tests first → **two PRs when there's a
database change** (migration first, app code second) → apply to `studio-pentest`, run a check script
→ apply to live → only then merge the app → **re-test on both databases** → write an evidence file →
update the Notion *Fix status* / *Fix evidence* columns.

A repeated pattern: **"protected database functions."** Instead of letting the app write directly to
a table, the database itself only allows the change through one guarded step that checks *who* you
are (e.g. `review_task_run`, `claim_ai_request`, `activate_policy`). That way even a clever user
calling the database directly can't skip the rules.

| Group / stream | Findings | Decision | What changed (plain words) | Evidence |
|---|---|---|---|---|
| 0 — Supabase settings | F-12, F-19, F-04 (password part) | — | Stronger password rules, unused login turned off, database settings hardened. | `retest-group0-settings.md` |
| 1 — Review once | F-01, F-21 | ADR-0028 | A review decision can only be made once, only through `review_task_run`. | `retest-group1-review.md` |
| 2 — AI rate limit | F-02 | ADR-0030 | Each person is limited (e.g. 10 AI requests a minute) before any Claude call. | `retest-group2-rate-limit.md` |
| 3 — Leader-only policy | F-03, F-18 | ADR-0031 | Only leaders change policy; activation is one all-or-nothing step. | `retest-group3-policy.md` |
| 4 — Policy text as data | F-20, F-08 | ADR-0032 | Policy text is marked as *data, not instructions* to the AI; imports show a preview and keep the safety floor. | `retest-group4-policy-text.md` |
| 5 — Sessions & headers | F-05, F-06, F-09 | ADR-0033 | Sessions expire (24 h / 1 h idle); cookies hidden from scripts; content security policy and safety headers. | `retest-group5-session-headers.md` |
| A — Sign-up limits | F-07, F-10 | ADR-0034 | Name length limits in the app *and* the database; max 5 sign-ups per IP per hour (stored as a hash, not the raw IP); same message whether or not the email exists. | `retest-stream-a-signup.md` |
| A — Login lockout | F-04 | ADR-0037 | Lockout after repeated failed logins per account and per IP. | `retest-stream-a-login-lockout.md` |
| A — Wizard draft | F-11 | — | Wizard answers cleared from the browser at logout. | `retest-stream-a-wizard-draft.md` |
| A — Security events | F-22 | ADR-0040 | Failed sign-ins and refused access logged on the server, with no personal data. | PR #149 (re-test file not yet written) |
| B — CI security gate | F-17 | ADR-0035 | Permission tests run as a named CI check; CodeQL added; a GitHub ruleset on `main` blocks merging if checks fail, and **no direct pushes — docs go via PR too**. | `retest-streamB-ci-gate.md` |
| B — Dependencies | F-16 | ADR-0038 | Upgraded to Vitest 4; CI now fails on any high/critical issue in *any* package. 0 issues after. | `retest-streamB-dependencies.md` |
| C — Audit writes | F-14 | ADR-0039 | Audit entries only through one protected step (7/7 checks pass). | `retest-streamC-audit-write.md` |
| C — Claude call limits | F-15 | — | 30-second timeout, at most 2 retries, AI text capped at 6,000 characters. | PR #151 (merged today; re-test not yet written) |

**Extra security fixes found along the way (not on the original list):**
- **Co-Pilot sent raw personal details to the AI** — found while writing the data page. Fixed in
  PR #116 (strip before storing/sending) and PR #117 (cleaned past Co-Pilot summaries; check script
  `copilot-clean-check.sql` passed on both databases).
- **A Co-Pilot "don't" assessment can never be approved** — enforced by the database (**ADR-0036**, PR #131).
- **TRUNCATE (wipe a whole table) revoked** from app roles (PR #83).

---

## ⑦ Mistakes I made — and what each one taught me

Honest list, pulled from the handover log and commit history.

| # | What happened | What I learned |
|---|---|---|
| 1 | **Code reached `main` before its database migration was run** (rule-suggestions card). The page quietly showed "no rules yet" until the migration ran. | Run the migration **before** pushing code that reads new columns. Later this became the formal order: test DB → live DB → *then* merge. |
| 2 | **An error was treated as "empty."** Reading the policy failed but the app showed "no rules yet"; reading the summary failed but could show "0 reviewed". | Never let "I couldn't read it" look the same as "there's nothing there." Fixed with ADR-0027 and the all-or-nothing summary reader. |
| 3 | **Parallel lanes collided** — two chats both took ADR-0021 and the same migration number; another took ADR-0023. | Check the next free number right before writing; give parallel chats clear file ownership. |
| 4 | **Mixed work on one branch** — PR #99 (review-once fix) also carried the landing-page redesign commit. | One branch = one change. Keep unrelated uncommitted files apart. |
| 5 | **Main went red** — I set up a "two-tier" skill-sync shortcut, the catalog fell out of sync (21 listed vs 22 real), and some files weren't formatted. | Reversed it: one complete commit per skill. The skills gate exists exactly to catch this. |
| 6 | **Direct pushes to `main`** for docs, which skipped checks. | ADR-0035: a ruleset now refuses direct pushes; everything goes through a PR. |
| 7 | **Two "order slips"** — go-live steps were given for a PR that was already merged. | Always check whether the PR is merged before giving go-live steps. |
| 8 | **Misunderstanding: demo vs video.** I asked for a way to show the product; an interactive `/demo` and a landing "Try it" section were built, but I meant a **video**. The section was removed (PR #115); the demo button stayed. | Confirm the *format* of what I want before building. The video is now its own card. |
| 9 | **Flaky build** from downloading a font at build time. | Builds should not depend on the internet; self-host (ADR-0017). |
| 10 | **Supabase SQL Editor trap** — "Run and enable RLS" mangled a migration script. | Always pick **"Run without RLS"** for migrations that set up security themselves, and check the project name (test vs live) top-left. |
| 11 | **Laptop pointed at the test database** after the PenTest (env files). | Rename/remove test env files after testing; confirm the target project ID before any test. |
| 12 | **Real data exposed sloppy wording** — policies saying "myself reviews…" or a limit of "none". | Test with real-looking answers, not just ideal ones. Fixed in the seed validator and PR #134. |
| 13 | **Client bundle pulled in server code** (caught by the build). | Keep pure logic and database code in separate files (`lib/domain` vs `lib/data`). |
| 14 | **Two ADR numbering schemes** — code comments saying "ADR-27" meant the Build-Plan's ADR-27, not repo ADR-0027. | Logged as a clean-up; one numbering scheme is clearer. |
| 15 | **Security requirement figures were wrong at first** — session limits SR-08/09 corrected to 24 h / 1 h. | Check cited figures against the source (NIST SP 800-63B) before publishing. |

---

## ⑧ What's still open (as of 2026-11-24)

- **Write my own "What I Did / What I Learned"** in `Week 5 Coding Challenge/SUBMISSION.md` and the
  Week 6 submission (no AI).
- **Re-test evidence** for F-22 (security event log) and F-15 (Claude call limits) — both merged, no
  `retest-*.md` file yet.
- **Refresh `security/pentest-report.md`** from Notion (it's stale on SR-08/09 and fix statuses).
- **X3 / SR-24** — Vercel *preview* deployments using the live database: I couldn't confirm from the
  evidence files whether this was changed. Worth checking.
- Not yet done: real screen-reader test of the demo; custom email (SMTP) for real users' auth emails;
  reviewed privacy policy + terms before inviting real organisations (MMP card); self-serve account
  deletion (MMP); walkthrough video; 8 "Should" UX items.

---

## ⑨ Mini glossary

| Term | Plain meaning |
|---|---|
| **CI / CD** | Automatic checks on every push / automatic publishing when merged. |
| **Workflow / check** | One automated job in GitHub Actions that passes (green) or fails (red). |
| **PR (pull request)** | A proposed change that is reviewed and checked before joining `main`. |
| **Migration** | A script that changes the database structure or its security rules. |
| **RLS (row-level security)** | Database rules deciding which rows each user can see or change. |
| **Protected function** | A database step that is the *only* way to make a certain change, and checks who you are. |
| **ADR** | Architecture Decision Record — a short note of a big decision and why. Never edited; replaced by a newer one. |
| **BDD** | Given / When / Then scenarios describing behaviour, turned into tests. |
| **PenTest** | Attacking your own app (with permission) to find weaknesses. |
| **P1 / P2 / P3** | Severity: High / Medium / Low. |
| **PII** | Personal details (email, phone, SSN, card number). |
| **Prompt injection** | Hiding instructions in text so the AI does something it shouldn't. |
| **CSP** | Content Security Policy — browser rules limiting what a page may load or run. |
| **studio-pentest vs live** | The test copy of the database vs the real one. |
