# Week 6 handover — Security skills + PenTest homework

*Updated 2026-11-19 at an account switch (credits running low). Supersedes the earlier Week 6
handover. For the next chat, on another account.*

## Read this first (instructions for the new chat)

**Orient, then wait.** Do not build, draft, fill, or propose anything on your own.

1. Pull `main` and read this file, then the sources under "Where things live."
2. Give Val a **short, plain-language orientation**: what the homework needs, what is done, and
   what the next step in the build plan is.
3. **Stop and ask Val what the next step is.** Work one move at a time, with her directing each
   step. She is learning the process — don't hand her finished work.

Project rules still apply: run the routing check from `CLAUDE.md`, draft any skill in chat before
it touches the repo, give full final versions (not diffs), keep sourcing honest, and end each
working turn with 🧾 receipts. Val commits and pushes herself in GitHub Desktop, so give her the
file list and copy-ready commit text together, and install each skill on its own branch (never
`git add .`).

## Scope of work

**Homework:** *Week 6 Coding Challenge — Security Test a Code Base* (Notion:
`app.notion.com/p/41e975c3b95080c48a58ce5f165b318f`). Submit to mdenner@techfleet.org. Two
deliverables, both into the **Week 4 GitHub repo** under `/security`:

1. **Security Research Report** + slide deck. Pick **one** software layer (Presentation, Service,
   Domain, Data Source, or Database) and research every attack at that layer. Follow the *Security
   Research Report Template* (`app.notion.com/p/125975c3b95082bf81f4010ca197773f`) — verified
   sections: **Introduction · Layer · Vulnerabilities · Challenges of Securing This Layer · How to
   Fix The Vulnerabilities.** The deck is not templated.
2. **PenTest Report.** Full pentest of the Week 4 app with Claude Code, **using Claude agents**,
   covering **every layer** (5 software layers + 3 network tiers: client, server, database). Write
   the requirements specs in Notion. Follow the *PenTest Report Template*
   (`app.notion.com/p/108975c3b95083e2b55f817c6bcabda0`) — verified contents: a **prompt script**
   ("fill the Notion template before the test," "skeptically audit the audit table," "how can
   Wireshark be used — they have an MCP"); **Background · Code Being Tested · Scope**; two Notion
   databases **PenTest Audit** + **PenTest Findings**; **Recommendations**; **BDD Scenarios**. The
   template points the report format at `pentestreports.com/downloads/pentest-report-example.pdf`.

**Written by Val, no AI:** the "What I Did" and "What I Learned" sections (≥2 paragraphs each).
The teacher says he'll check — **don't draft these.**

*To confirm with Val:* is the Week 4 repo this repo (`studio/` app — Next.js + Supabase + Vercel)?

**Val's goal:** build/update the Claude Skills so the *process* guides her through the homework
well — she does the homework herself, with the skills leading.

## The journey so far (this session)

1. **Oriented** from the prior handover; confirmed `secure-coding` v2.0 and `responsible-ai` v1.1
   were already done, installed, and green.
2. **Built `security-testing` v1.0** — the skill that drives the PenTest deliverable. Full method:
   - **Drafted in chat** (skill-authoring): frontmatter with a triggering description + a `Do NOT`
     boundary, six-part body, 8 rules each grounded in the study guide §7–§11 / OWASP WSTG.
     Rules: authorization-first → test-every-phase → 6-step threat model → an inline **5 software
     layers × 3 network tiers** test grid with OWASP Testing Guide refs → injection-as-a-family
     (typed + hidden) → fill-template-then-audit-the-audit-table (+ drive agents from the plan) →
     P0–P3 findings → finding → recommendation → BDD → blocking CI check.
   - **Evaluated** (skill-evaluation): 3 realistic tasks × 2 arms, ~19 checks written *before* any
     output. **With-skill 19/19 vs no-skill baseline 9/19**; **triggering 12/12** (6 should-fire,
     6 near-miss negatives all routed away). The skill's value: it pulls output onto the course's
     OWASP-WSTG method (6-step threat model, P0–P3, finding→BDD→CI) where baseline defaulted to
     STRIDE / CVSS. *Caveats:* one run per arm, graded by the same session (not blind), with-skill
     arms got the skill text pasted inline. Verdict: **keep as-is, no revision.**
   - **Installed in one commit** — `de9566d` (feat(skills): add security-testing v1.0), merged and
     **pushed to `origin/main`**. Touched every place: the `SKILL.md`, its `CLAUDE.md` bullet, and
     the full `docs/SKILLS-LIBRARY.md` entry (live `### security-testing ✅`, category table
     `4 / 4`, built-count `23`, roadmap status ✅). Skills gate: **PASS (23 skills).**
3. **Gap analysis** — read the real homework page + both templates (not from memory) and mapped
   every task to a skill (see next section). Conclusion: **no new skill is strictly required to do
   the homework**; the security skills + `technical-planning` + cross-cutting skills cover both
   deliverables. One real gap surfaced: the **slide deck** (see build plan).

## What's underway

Nothing half-done. Working tree is **clean**; local `main` == `origin/main`. `security-testing` is
live and loadable. The next account just needs to **pull `main`**.

## Skill coverage (homework task → skill)

- **Vulnerabilities at a layer / per-layer attacks** → `security-testing` ✅
- **How to Fix / OWASP secure-coding principles** → `secure-coding` v2.0 ✅
- **Describe the layer (software + network)** → study-guide content (not a skill) — see build plan step 2
- **PenTest: plan, run, every layer, audit + findings, agents, P0–P3, BDD** → `security-testing` ✅
- **Requirements specs in Notion** → `technical-planning` (NFR + tech reqs + BDD) + `secure-coding` (security reqs) ✅
- **Fix vulns; Vercel/Supabase config** → `secure-coding` (config) + `judge-arch` + `ci-cd-pipeline` ✅
- **Slide deck** → only `pitch-deck` exists, and it's a *persuasive product/investor* deck — **genre mismatch** ⚠️

## Build plan (what's next, in order — Val picks each step)

1. **Slide-deck gap (Val's pending choice).** The research report needs an *explainer/educational*
   deck; `pitch-deck` is tuned for persuasion (Kawasaki 10/20/30, Sequoia arc). Options presented:
   **(a)** a small neighbor edit adding an "explainer deck" mode to `pitch-deck` (recommended —
   cheaper, storytelling parts still apply), or **(b)** a new lightweight `explainer-deck` skill.
   Val had not chosen when this handover was written.
2. **Study guide → repo reference (housekeeping, not a skill).** Still not in the repo. It now
   lives on the homework Notion page *and* was pasted into chat; proposed home
   `docs/reference/week-6-security.md` (same pattern as the Week 4 reference), so skills and any
   account can cite it.
3. **Report-writing gap — optional, low priority.** No skill guides writing a multi-page research
   report (`documentation` = code docs; `product-specs` = PRDs). The template already gives the
   five sections and the content skills supply the substance, so a `technical-writing` skill is
   reusable-but-not-needed-now.
4. **Optional neighbor edits (with Val's OK):** `ci-cd-pipeline` — say security checks *block*, not
   warn; `ai-evaluation` — add the prompt-injection test as an eval case.
5. **Then the homework itself, with Val leading:**
   - *Research report:* choose the layer → draft the 5 sections from `security-testing` (vulns),
     `secure-coding` (fixes), and the study guide (layer description) → build the deck.
   - *PenTest:* fill the Notion template *before* testing (everything except Findings +
     Recommendations) → skeptically audit the audit table → test with Claude agents across every
     layer (and note how Wireshark MCP fits the network tiers) → record findings (P0–P3) →
     recommendations → BDD.
   - Write the requirements specs in Notion.
   - Add the `/security` folder to the Week 4 repo, then email the repo link to the teacher.
   - Val writes "What I Did" / "What I Learned" herself (no AI).

## Known notes / decisions

- **Roadmap week label:** `docs/SKILLS-LIBRARY.md` lists the pentest as **W5 / Nov 16**, while the
  homework page says **Week 6**. Val chose to **leave the roadmap week numbers as-is** (the repo
  numbers weeks differently than Tech Fleet's "Week 6" naming; there's already a separate W6 row).
  The stale *entry* label was fixed; don't re-flag the roadmap.

## Where things live

- Skills: `.claude/skills/security-testing/SKILL.md` (v1.0), `.claude/skills/secure-coding/SKILL.md`
  (v2.0), `.claude/skills/responsible-ai/SKILL.md` (v1.1)
- Catalog + build method: `docs/SKILLS-LIBRARY.md`; rules for changing skills: `CLAUDE.md` →
  "Building and changing skills"
- Gate: `node scripts/skills-gate.mjs` (PASS, 23 skills)
- Homework + templates: the Notion links above
- Study guide: on the homework Notion page; **not in the repo yet** (build plan step 2)
