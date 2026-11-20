# Week 6 handover — Security skills + PenTest homework

*Written 2026-11-19 at an account switch (credits ran out). For the next chat, on the second account.*

## Read this first (instructions for the new chat)

**Orient, then wait.** Do not build, draft, fill, or propose anything on your own.

1. Pull `main` and read this file, then the sources listed under "Where things live."
2. Give Val a **short, plain-language orientation**: what the homework needs, what is done, and
   what the next step in the build plan is.
3. **Stop and ask Val what the next step is.** Work one move at a time, with her directing each
   step. She is learning the process. Don't hand her finished work.

Project rules still apply: run the routing check from `CLAUDE.md`, draft any skill in chat before
it touches the repo, give full final versions (not diffs), keep sourcing honest, and end each
working turn with 🧾 receipts. Val commits and pushes herself in GitHub Desktop, so give her the
file list and copy-ready commit text together.

## Scope of work

**Homework:** *Week 6 Coding Challenge — Security Test a Code Base* (Notion:
`app.notion.com/p/41e975c3b95080c48a58ce5f165b318f`). Two deliverables:

1. **Security Research Report.** Pick **one** software layer (Presentation, Service, Domain, Data
   Source, or Database) and research every attack at that layer. Write a 3–5 page report and a
   slide deck. Follow the *Security Research Report Template*
   (`app.notion.com/p/125975c3b95082bf81f4010ca197773f`), whose sections are Introduction · Layer ·
   Vulnerabilities · Challenges of Securing This Layer · How to Fix The Vulnerabilities.
2. **PenTest Report.** Run a full PenTest of the Week 4 app with Claude Code, **using Claude
   agents**. It must test **every layer** (all 5 software layers and all 3 network tiers: client,
   server, database). Write the full requirements specs in Notion. Follow the *PenTest Report
   Template* (`app.notion.com/p/108975c3b95083e2b55f817c6bcabda0`). That template includes:
   - a prompt script, including "fill out the template before the test," "skeptically audit the
     audit table," and "how can Wireshark be used (they have an MCP)";
   - Background, Code Being Tested, and Scope;
   - two Notion databases, **PenTest Audit** and **PenTest Findings**;
   - Recommendations and BDD.

**Submission:** put both reports in the Week 4 GitHub repo under `/security`, then email the
teacher the repo link. The "What I Did" and "What I Learned" sections (at least 2 paragraphs each)
must be written by Val herself. The teacher says no AI for these, so don't draft them.
*To confirm with Val:* is the Week 4 repo this repo (`studio/` app, Next.js + Supabase + Vercel)?

**Val's goal for this session:** build and update the Claude Skills so she can do the homework
well herself, with the skills guiding the process.

## The journey so far

1. **Oriented.** Read the homework page, both templates, Val's study guide, and the existing skills.
   Proposed three pieces of work: update `secure-coding`, build `security-testing`, and save the
   study guide as a reference doc. Val chose to start with `secure-coding`.
2. **Drafted `secure-coding` v2.0.** Checked the OWASP Top 10:2025 list at top10.owasp.org/2025.
   The order changed from 2021: A02 is now Misconfiguration, A03 is the new Software Supply Chain
   Failures, A05 is Injection, and A10 is the new Mishandling of Exceptional Conditions. The page
   gives no release date.
3. **Revised it after checking 4 things Val asked about:**
   - read the full OWASP LLM Prompt Injection Prevention Cheat Sheet (raw GitHub source);
   - confirmed the stack is Next.js 15 + Supabase + `@anthropic-ai/sdk`, and generalized the
     stack-specific rules into examples;
   - added the study-guide gaps (file/path handling, availability/rate limiting, least privilege);
   - kept the `security-testing` boundary, since the gate ignores `[[wikilinks]]`.
4. **Evaluated it.** Ran 3 realistic tasks × 3 arms against 28 checks written before any answers
   came back. Results: no skill 25, v1 26, v2 **28**. Triggering: v1 fired on 4/6 should-trigger
   prompts, v2 on **6/6**, with 0 false positives out of 6 near-misses.
   - *Caveats:* one run per arm, graded by the same session (not blind), and the "no skill" arm
     still read `CLAUDE.md`.
   - One weakness was found and fixed: rule 2 now says that query-builder filter strings
     (Supabase `.or()`) are an injection sink.
5. **Installed it.** Val committed it, then a follow-up sync commit:
   - **`470b6dd`** — secure-coding v2.0: the `SKILL.md`, its `CLAUDE.md` line, and its full
     catalog entry.
   - **`90ca354`** — follow-up: routing step 2 in `CLAUDE.md`, the governance Gate bullet and
     org-chart node, the reciprocal boundary on the planned `security-testing` entry, and
     **`responsible-ai` v1.1** (its "Do NOT" now sends prompt-injection defenses to secure-coding).
   - Skills gate: PASS (22 skills). The live re-test fired on file upload, prompt injection, and
     security acceptance criteria, and skipped README and unit tests.

## What's underway

Nothing is half-done. The working tree was clean after `90ca354`. Both skills were also copied to
`~/.claude/skills/` on the first account's Mac.

## Build plan (what's next, in order — Val picks each step)

1. **Put the study guide in the repo.** It currently lives *outside* the repo at
   `~/Desktop/information-network-security-study-guide.md` on the first machine, so this account
   can't see it yet. Proposed home: `docs/reference/week-6-security.md` (same pattern as the Week 4
   reference). Val needs to copy it in, or paste it into the chat.
2. **Build `security-testing`** (planned in SKILLS-LIBRARY → Security & Testing). It drives the
   PenTest deliverable. Proposed contents, all from the study guide §7, §8, §10, §11:
   - the OWASP security lifecycle (test at every phase);
   - the 6-step threat model (draw it → assets tied to CIA → what could go wrong per layer →
     rank by likelihood × damage → fix/remove/transfer/accept → re-check);
   - a per-layer test grid for 5 software layers × 3 network tiers, with OWASP Testing Guide refs;
   - the rule to get **written approval before testing**;
   - the 7-section PenTest report with P0–P3 severity;
   - findings → recommendations → BDD → a blocking CI check;
   - prompt-injection tests that cover both typed and hidden inputs.

   Follow the skill build method: draft in chat, run a baseline eval and a triggering test, then
   one commit covering every place. Reuse the eval pattern from step 4 above: checks written
   first, 3 arms, near-miss negatives.
3. **Small neighbor edits (optional, with Val's OK):**
   - `ci-cd-pipeline`: say that security checks *block*, not warn.
   - `ai-evaluation`: add the prompt-injection test as an eval case.
4. **Fix the roadmap label.** SKILLS-LIBRARY still lists the PenTest as **W5 (Nov 16)** and
   `security-testing` as "planned — Week 5." The homework page says Week 6. Confirm the real
   schedule with Val before editing.
5. **claude.ai skill copies.** A test agent saw a separate `anthropic-skills:secure-coding` in the
   skill listing, likely a claude.ai upload that may still be v1. Check whether the claude.ai zips
   for `secure-coding` and `responsible-ai` need re-uploading (the 2026-11-17 log mentions zip
   re-uploads).
6. **Then do the homework itself, with Val leading:**
   - Research report: choose the layer, then use the reference doc §5/§6/§9, the template, and a deck.
   - PenTest: fill the Notion template *before* testing (everything except Findings and
     Recommendations), then skeptically audit the audit table, then test with agents, then record
     findings, recommendations, and BDD.
   - Write the requirements specs in Notion.
   - Add the `/security` folder to the repo, then submit.

## Where things live

- Skills: `.claude/skills/secure-coding/SKILL.md` (v2.0), `.claude/skills/responsible-ai/SKILL.md` (v1.1)
- Catalog + build method: `docs/SKILLS-LIBRARY.md`; rules for changing skills: `CLAUDE.md` → "Building and changing skills"
- Gate: `node scripts/skills-gate.mjs`
- Homework + templates: the Notion links above
- Study guide: not in the repo yet (see build plan step 1)
