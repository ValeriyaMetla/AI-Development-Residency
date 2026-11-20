---
name: security-testing
description: Plans and runs a disciplined security test of an existing codebase — threat-model the app (draw it, tie assets to CIA, walk each layer for what could go wrong, rank by likelihood × damage), test every software layer and network tier against the OWASP Testing Guide, get written authorization before any pentest, then record findings by P0–P3 severity → recommendations → BDD → a blocking CI check. Use when finding vulnerabilities in a codebase, threat modeling, planning or running a pentest or security test plan, building a PenTest Audit or Findings table, writing a security test report, or driving AI agents to attack an app — even if the user doesn't say "security testing." Do NOT use for writing the defenses themselves or security requirements (use secure-coding), general test coverage or PR review (use testing-code-review), AI output-quality evals (use ai-evaluation), or CI pipeline mechanics (use ci-cd-pipeline).
metadata:
  version: 1.0
---

# Security Testing

## Intent

Find the holes before an attacker does — by planning the attack in advance and testing every
layer, not by one hacking pass at the end that misses most bugs and leaves damage that can't be
undone. This skill *finds* vulnerabilities and runs the test; the defenses it checks for are owned
by [[secure-coding]]. Grounded in the OWASP Testing Guide, the OWASP Security Testing Framework,
and the OWASP Top 10:2025.

## Rules

1. **Get written authorization before you test — this is the line between a pentest and an
   attack.** Before touching the system, agree in writing what is in and out of scope (which
   layers, which data, which accounts, destructive tests or not), and test against a copy for
   anything that could degrade or destroy. Social-engineering and denial-of-service tests
   especially need explicit sign-off first. A test you weren't authorized to run is an attack.

2. **Test at every phase, not only at the end.** Security testing is a lifecycle, not a final
   gate: review requirements and threat-model at **design**, review code against checklists while
   you **build**, run the pentest and config check at **launch**, and re-test every change while
   you **run**. A single hacking test at the end costs more and misses most problems.

3. **Threat-model first, in six steps.** Plan like the attacker before you test: **(1)** draw the
   system — users, screens, server, database — and mark every spot data crosses a layer (attacks
   happen there); **(2)** list the assets worth stealing, changing, or breaking and tie each to
   **Confidentiality, Integrity, or Availability**; **(3)** walk the map and ask what could go
   wrong, using the attack vectors for each layer (rule 4); **(4)** rank each threat by
   *likelihood × damage*, highest first; **(5)** decide per threat — fix, remove, transfer, or
   accept (and document accepted risk); **(6)** check the fixes and re-model when the app changes.

4. **Cover every software layer and network tier — test from this grid.** Walk all five software
   layers (Presentation, Service, Domain, Data Source, Database) across the three network tiers
   (client, server, database). Each check is a pass/fail expectation; OWASP Testing Guide (TG)
   refs are for lookup.
   - **Presentation (client).** Cookies `Secure`+`HttpOnly`, dead after logout, idle timeout
     *(TG 4.6)*; login lockout, no default creds, URL-swap to another user blocked, admin pages
     refused to basic users *(TG 4.4–4.5)*; a harmless test script in every field shows as plain
     text, never runs *(TG 4.7.1)*; no secrets in JS/source/comments; page refuses to load in a
     frame *(TG 4.1.5, 4.11.1)*.
   - **Service (internet / middle tier).** Proxy-tamper a price, ID, or hidden field → server
     rejects *(TG 4.10)*; call the API directly, change an ID → blocked, no-login → refused, flood
     → rate-limited *(TG 4.5)*; `http`→`https` redirect, no secrets over plain HTTP *(TG 4.9)*;
     cross-site form while logged in → action fails without a token (CSRF) *(TG 4.6.5)*; **prompt
     injection** — see rule 5.
   - **Domain (web server).** Script-as-image upload blocked, oversized refused, EICAR test file
     caught, `../` path traversal fails *(TG 4.5.1, 4.10.8–9)*; `; | '` in inputs → plain text, no
     crash, no code in error pages (command injection) *(TG 4.7.12)*; load-test and confirm
     throttling + recovery (DoS — **authorized, on a copy**) *(OWASP DoS Cheat Sheet)*.
   - **Data Source (query layer).** `'` and `' or '1'='1'` in each input → rejected, DB errors not
     leaked, `sqlmap` run (SQL injection) *(TG 4.7.5)*; a user can't edit another user's record,
     the app's DB account can't over-reach, every change logged with who + when *(TG 4.5.3)*;
     stored script in a comment/profile → plain text for other users and admin (stored XSS)
     *(TG 4.7.2)*.
   - **Database (database tier).** DB unreachable from the internet, default creds fail, a basic
     user can't pull others' rows, data encrypted at rest and in transit *(TG 4.2.1, 4.4.2,
     4.9.4)*; backups (`.bak`, `.old`, `backup.zip`) and directory listings not reachable
     *(TG 4.2.4)*.

5. **Hunt injection as one family, typed and hidden.** XSS, SQL, command, and prompt injection are
   one bug — untrusted input run as a command — at four layers. For AI features, test prompt
   injection both **directly** (type "ignore your rules") and **indirectly** (hide instructions in
   a file, page, or tool output the model reads, including text invisible when rendered); confirm
   no data leak and no tool misuse, and **save the tests and re-run them after every change**.

6. **Fill the report template before testing, then skeptically audit your own audit table.** Plan
   every test as a row *before* you run it — layer, network tier, OWASP risk, steps — so the test
   is deliberate, not improvised; everything except Findings and Recommendations is written up
   front. Then review the audit table against the grid (rule 4) and the threat model (rule 3) and
   ask what layer, tier, or attack vector it misses — a plan you didn't challenge has gaps. When
   driving AI agents to run the tests, give each agent a scoped, authorized task from the audit
   table and verify its result yourself; the agent executes the plan, it doesn't replace it.

7. **Record each finding by severity, P0–P3.** One row per problem: name and severity
   (**P0 Critical → P3 Low**), the layer and network tier, the weak spot, the attacker impact, the
   principle/cheat sheet to apply, and how to reproduce it. Rank the list so the worst is fixed
   first.

8. **Close every finding: finding → recommendation → BDD → blocking CI check.** Turn each finding
   into a numbered fix (most severe first, saying what to change and which finding it solves),
   write a Given/When/Then scenario that includes the attacker's path to prove the fix, and add
   that scenario to CI as a check that *blocks* the merge — so a closed hole can't silently return.

## Checklist before calling a security test "done"

- [ ] Written authorization and agreed scope exist before any test; destructive tests ran on a copy
- [ ] Testing happened across phases (design/build/launch/run), not only at the end
- [ ] A threat model exists: diagram with layer-crossings, assets tied to C/I/A, threats ranked by likelihood × damage
- [ ] All 5 software layers × 3 network tiers tested from the grid; each check has a pass/fail result
- [ ] Injection tested as a family — XSS, SQL, command, and prompt injection (prompt injection typed *and* hidden)
- [ ] The audit table was filled before testing and skeptically re-checked for missed layers/vectors
- [ ] AI agents (if used) ran scoped, authorized tasks from the audit table, with results verified
- [ ] Every finding has a severity P0–P3, layer/tier, impact, and reproduction steps
- [ ] Every finding has a recommendation, a BDD scenario on the attacker path, and a blocking CI check

## When unsure

- If you don't have written authorization and scope, stop — don't test until you do.
- If a test could degrade or destroy data (DoS, injection that writes), run it on a copy, not prod.
- If you've *found* a vulnerability and need to design the fix or write security requirements,
  switch to [[secure-coding]].
- If you're testing application behavior or coverage in general rather than hunting for attacks,
  that's [[testing-code-review]].
- If the audit table feels thin, re-walk the grid (rule 4) and the threat model (rule 3) before
  running — a missed layer is a missed vulnerability.

## Based on

- **OWASP Web Security Testing Guide (WSTG)** — owasp.org/www-project-web-security-testing-guide
- **OWASP Security Testing Framework** (the test-every-phase lifecycle)
- **OWASP Top 10:2025** — top10.owasp.org/2025
- **OWASP Cheat Sheet Series** — LLM Prompt Injection Prevention, Denial of Service
- Tech Fleet AI Development Residency, Week 6 Information & Network Security material (§7–§11)
- Composes with [[secure-coding]] (owns the defenses these tests check for),
  [[testing-code-review]], and [[ci-cd-pipeline]] (where the blocking checks live)
