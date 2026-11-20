# Week 6 Reference — Information & Network Security

> **What this is.** Val's study guide for the Week 6 residency material on **Information
> Security** and **Network Security**, kept in the repo so the security skills and both Claude
> accounts can cite it. Diátaxis type: **Reference**. It is a *study guide* — Val's synthesis of
> the lecture, not a verbatim capture of the slides — so cite it as such. Anything we decide to
> *adopt* graduates to a skill (`secure-coding`, `security-testing`), `BUILD-RULEBOOK.md`, or an ADR.
>
> **Source.** Added 2026-11-20 from Val's `information-network-security-study-guide.md`, content
> unchanged below this note. Used by: `secure-coding` v2.0 and `security-testing` v1.0 (rules
> grounded in §3–§11), and the Week 6 research report (the "Layer" section draws on §5).


*Built from the Week 6 material. Purpose: enough fluency to (1) author Claude Skills safely and (2) run the security pipeline on your own product.*

---

## 0. Where this sits

Your Skills & Practices Framework has two big domains — **User Experience** and **Product Management**. This material covers two sub-disciplines of Product Management:

| Area | What it is | Example deliverables |
|---|---|---|
| **Information Security** | Keeping data safe from hackers and leaks, wherever it lives (on paper, on computers, in transit). | Security audit · secure coding · threat models · security protocols · penetration test report |
| **Network Security** | Protecting the connections a product relies on, so data stays safe as it travels between systems. | Firewall · network security policies · incident response plan |

Rough split to hold in your head: **Information Security guards the data and the app itself; Network Security guards the connections between systems.** Most real attacks touch both.

---

## 1. The mental model: the Evil Cake Company

The whole course runs on one analogy. A **restaurant** = your system (or an AI agent/app). The **Evil Cake Company** = an untrusted outside party. Every "evil thing" is one way that party causes harm — and each maps to a real concept:

- **Swap in an evil cake at delivery** → tampering with output in transit
- **Tamper with the ovens** → compromising your infrastructure
- **Change the ingredients** → corrupting your inputs/data
- **Impersonate the wait staff** → spoofing / impersonation
- **Hold the kitchen hostage** → ransomware
- **Steal the recipes** → IP / trade-secret theft
- **Steal customer info** → data breach
- **Send 10,000 fake orders** → denial of service
- **Sic their evil devs on you** → automated, scaled attacks
- **Send an "evil food order"** → **injection** (the order said *"Ignore all other instructions…"* — this is prompt injection)
- **Hundreds more** → the threat landscape keeps evolving

> **Why this matters for you:** the "evil food order" is a textbook **prompt-injection** example. When an AI agent reads untrusted content, a hidden instruction can hijack it. This is the single most relevant threat when you build a Claude Skill.

---

## 2. Glossary (grouped for recall)

**The big picture — what you protect**
- **Information security** — Protecting info from being seen, changed, or destroyed by the wrong people, wherever it lives.
- **Network security** — Protecting the connections between computers and the data crossing them (firewalls, HTTPS, blocking bad traffic).
- **CIA (Confidentiality, Integrity, Availability)** — The three goals (see §4).

**What you defend against**
- **Threat** — Anyone/anything that could cause harm (attacker, teammate's mistake, server outage).
- **Vulnerability** — A weakness an attacker could use. Not every bug is a vulnerability, but many start as bugs.
- **Risk** — Likelihood a threat exploits a vulnerability × how bad the damage. Fix biggest risks first.
- **Attack surface** — All the places someone could get in (every page, form, login, upload, API, external service). Bigger = more to protect.
- **Attack vector** — The specific path in (fake email, a form that accepts harmful input, a stolen password).

**How you defend**
- **Authentication** — Checking *who* someone is (password, phone code, passkey).
- **Authorization** — Checking *what* they're allowed to do, *after* authentication.
- **Least privilege** — Give every person and every part of the app only the access it needs.
- **Encryption** — Scrambling data so only a key-holder can read it (HTTPS = in motion; DB encryption = at rest).
- **Defense in depth** — Many layers, so one failure doesn't let the attacker in.
- **Secure coding principles** — Rules for hard-to-attack code (safe DB access, least access, no secrets in code, fail safely).
- **Security policy** — Written rules: who can access what, how passwords/data are handled, what to do when something goes wrong.

**How you check your work**
- **Threat modeling** — Planning *ahead* how someone could attack, before you build and whenever the app changes.
- **Penetration testing** — A planned, permitted attack on your own app to find weak spots before a real attacker does.

---

## 3. Fundamental principles

**The mindset (5 principles):**
- **Never Trust the User** — *The most important rule.* Treat all user input as a possible attack; the server validates everything itself and never lets the browser decide what's allowed.
- **Least Privilege** — Minimum access per person/account/program. A stolen login should only do a little.
- **Defense in Depth** — Protect the same thing in several places (locked door + guard + cameras + safe).
- **Fail Safely** — On an unexpected error: stop, show no private data, treat the user as having no access until fixed.
- **Security Through Obscurity** — ⚠️ *Anti-pattern.* Hiding how your system works is **not** a defense on its own; it helps only *on top of* real locks. File this as "what not to rely on."

**The layers you build (defense categories):** train your employees · secure coding · secure network configuration · secure files · secure permissions.

> **The rule that ties them together:** you can't pick one — you need **all** of them at once. That *is* Defense in Depth.

---

## 4. The CIA triad — your organizing frame

For each piece of data, ask three questions: *Who should see it? Is it correct? Will it be there when needed?*

| Goal | Means | Evil Cake attack | Real-app version |
|---|---|---|---|
| **Confidentiality** | Only the right people see it | Copy secret recipes; steal customer addresses | Data leak. *Once private data is out, you can't take it back.* |
| **Integrity** | Data is correct, unchanged without permission | Swap sugar for salt; swap the cake in transit | Change prices/grades/balances. *Altered data looks normal, so it's trusted for a long time.* |
| **Availability** | The app/data are there when needed | Ransom the kitchen; flood 10,000 fake orders | Site crash or ransomware. *Even with nothing stolen, you lose money and trust.* |

Every threat in this course slots into C, I, or A. The "evil food order" (prompt injection) can hit **all three** — which is why it's the standout.

---

## 5. The architecture: layers, surfaces, and vectors

Two things are attackable and you must defend both: the **software stack** and the **network path**.

- **Software layers:** Presentation → Service → Domain → Data Source → Database
- **Network layers:** Client → Web Server → Database Server

These combine into four "places," each with its own attack surfaces and vectors:

### Place 1 — You & Your Computer (Presentation / Client)
*Your browser, desktop, or mobile app.*
- **Surfaces:** browser software · HTML/CSS/JS · code libraries · the UI · **you, the human** · web extensions.
- **Vectors:** session/cookie theft · vulnerabilities in CSS/HTML/JS · authentication & authorization hacks · **social engineering** · cross-site scripting (XSS).

### Place 2 — The Internet (Service / Middle layer)
*The communication between your computer and the server (Client → Server → Database).*
- **Surfaces:** APIs · HTTP requests · webhooks · your router.
- **Vectors:** HTTP request tampering · proxy attacks · API attacks · man-in-the-middle (MITM) · request forgery (CSRF) · **AI prompt injection**.

### Place 3 — The Web Server (Domain / Server)
*Holds the app's files, handles client requests, talks to the database.*
- **Surfaces:** server config · OS · server permissions · business-logic scripts · server languages · files.
- **Vectors:** file tampering · denial of service · command injection · file theft.

### Place 4 — The Database Server (Data Source + Database)
*Stores the data; handles pull/edit requests from the web server.*
- **Surfaces:** database software · SQL · data records · DB permissions · files · DB config.
- **Vectors:** SQL injection · data tampering · stored XSS · data theft.

> **The pattern under the whole stack — the injection family.** XSS (client), prompt injection (internet), command injection (web server), SQL injection (database) are *one idea at four layers*: **untrusted input treated as a command instead of data.** The "Bobby Tables" joke (SQL injection) and the "evil food order" (prompt injection) are the same lesson. Learn this one principle and you've learned the spine of the course — and it's exactly the risk you design against when a Claude Skill reads files, pages, or tool output.

---

## 6. OWASP — the real-world standard

- **Who:** the **Open Worldwide Application Security Project**, a free/open nonprofit community (since 2001), treated as a trusted guide because so many experts vet it.
- **Focus:** *application* security — the app itself (forms, logins), not just the network — aimed at builders who aren't security experts.
- **OWASP Top 10:** the ten biggest web-app risks (latest: 2025) — broken access control, unsafe settings, weak logins, injection, etc. The standard checklist; a good starting point.
- **OWASP Cheat Sheet Series:** 100+ short guides, one topic each (logins, passwords, file uploads, **AI tools**), written like recipe cards. **Top 10 = what the risks are; cheat sheets = how to guard.**
- **How teams use them:** open the relevant cheat sheet → turn its steps into **acceptance criteria** → turn those into **test scenarios** → prove each guard before launch. *You can also tell an AI coding tool to follow a cheat sheet, then check its code against it.*

---

## 7. The security lifecycle (OWASP Security Testing Framework)

Test at *every* stage, not just the end — testing only after building costs more, and one final hacking test misses most bugs.

| Phase | When | Key activities |
|---|---|---|
| **1 — Before You Build** | Prep | Set up your process · write security rules first · decide what to measure |
| **2 — Plan & Design** | Design | Review requirements · review design · diagram the app · **make threat models** |
| **3 — While You Build** | Code | Walk through / review code against checklists → *secure coding + CI/CD* |
| **4 — When You Launch** | Ship | **Run a penetration test** · check the setup (no risky defaults) |
| **5 — After Launch** | Run | Review ops · regular security tests · re-check every change · monitor |

---

## 8. Threat modeling — the method you run

**What:** planning for attacks *before* you build — looking at a feature like an attacker. A *team* effort (PM, designer, devs, QA, security).
**When:** during design, before code, and again whenever the app changes.
**Why it pays:** a NIST study found a problem caught after launch costs ~**30× more** than one caught at the start; some harm (stolen data) can never be undone.

**The 6 steps:**
1. **Draw what you're building** — map users, screens, server, database; arrow the data; **mark every spot data crosses a layer** (attacks happen there).
2. **List what you need to protect** — everything worth stealing/changing/breaking; tie each to **C, I, or A**.
3. **Ask what could go wrong** — walk the map, think like Evil Cake Corp, use **the attack vectors from each layer**.
4. **Rank each threat** — likelihood × damage; highest risk first.
5. **Decide & write it down** — fix / remove / transfer / accept; turn fixes into **acceptance criteria + BDD scenarios**; document accepted risks.
6. **Check your work & repeat** — test the fixes; update the model when the feature changes.

---

## 9. Building the defenses

### The 5 deliverables (Defense in Depth)
CI/CD pipelines that catch vulnerabilities · secure code · security requirements · security testing reports · security configurations (written as a checklist so every server is set up the same).

### How to make Security Requirements (8 steps)
1. Start from your threat model (each fix → ≥1 rule).
2. Check the OWASP Cheat Sheets (fill gaps).
3. Write rules that **never trust the user** (server-side check per input point).
4. Write each rule in plain words (testable; ban "secure"/"safe").
5. Add rules to acceptance criteria (not *done* until each passes).
6. Write BDD scenarios per rule (Given/When/Then, incl. attacker path).
7. Review & keep current (team + security expert; update with the threat model).
8. Turn every rule into a **CI/CD check**.

### How to Code Securely (8 steps)
1. Find the cheat sheets for your feature — *and give them to your AI coding tool.*
2. Follow your chosen software patterns (each check lives in **one place**).
3. Presentation layer: **escape output** → stops XSS.
4. Domain layer: **authorization on the server, every request**.
5. Data source layer: **safe/parameterized queries** → stops SQL injection.
6. Keep secrets & errors private (vault; short error messages; details to a private log).
7. Never describe your logic in browser comments (anyone can "View Source").
8. Turn coding rules into **CI/CD checks**.

### How to make CI/CD Pipelines for Security (6 steps)
1. Run security tests (BDD scenarios) on every change; a fail blocks go-live.
2. Scan the code for weak spots (static analysis).
3. Check add-ons/dependencies for known holes.
4. Scan for leaked secrets (block & rotate).
5. Make checks **block, not just warn**.
6. Watch results & keep improving (each miss → a new check; regression).

> **The spine of §7–9 (memorize this):**
> **Threat model → security requirements (plain, testable rules) → acceptance criteria + BDD → secure code (per layer, via OWASP cheat sheets) → CI/CD checks that *block* → monitor & iterate.**
> Two reflexes recur everywhere: **"never trust the user"** and **"turn each rule into a blocking CI/CD check."**

---

## 10. Testing the defenses (per layer)

Each test is phrased as a **pass/fail expectation** — i.e. a BDD scenario made executable. OWASP Testing Guide (TG) references kept for lookup.

### Presentation / Client
- **Session/cookie:** cookie marked Secure + HttpOnly; copied cookie fails after logout; idle session auto-logs-out. *(TG 4.6.2/.6/.7)*
- **CSS/HTML/JS:** page refuses to load in a frame; no secrets in source/comments; external scripts checked. *(TG 4.1.5, 4.11.1)*
- **Authn/authz:** 5 wrong passwords → lock; default creds fail; URL-swap to another user → blocked; admin pages blocked for basic users. *(TG 4.4.2/.3, 4.5.2/.4)*
- **Social engineering:** **get written approval first**; practice phishing; test help-desk identity checks; coach & re-test. *(Planned exercise, not in TG.)*
- **XSS:** harmless test script in every field → shows as plain text, never runs; run a scanner. *(TG 4.7.1, 4.11.1)*

### Internet / Service
- **HTTP tampering:** proxy (OWASP ZAP), change a price/ID/hidden field → server rejects. *(TG 4.10.1–2)*
- **Proxy:** private pages not cached; Back after logout shows nothing; all HTTPS. *(TG 4.4.6, 4.9.1)*
- **API:** call directly; change ID → blocked; no-login → refused; flood → rate-limited. *(TG 4.5.2/.4)*
- **MITM:** TLS scanner; http→https redirect; no passwords/scripts over plain HTTP. *(TG 4.2.7, 4.9.1/.3)*
- **CSRF:** hidden-form test page while logged in → action fails (missing token). *(TG 4.6.5)*
- **AI prompt injection:** type *"ignore your rules"*; hide orders in a file/page the AI reads; confirm no data leak or tool misuse; **save tests, re-run after every change.** *(OWASP LLM Prompt Injection Prevention Cheat Sheet — not in TG.)*

### Web Server / Domain
- **File tampering:** script-as-photo → blocked; oversized → refused; EICAR test file → caught; `../` → fails. *(TG 4.5.1, 4.10.8–9)*
- **DoS:** approval first, test a copy; load-test; throttling works; app recovers. *(OWASP DoS Cheat Sheet.)*
- **Injection:** `; | '` in inputs → plain text, no crash; no code in error pages; injection scanner. *(TG 4.7.12, 4.8.2)*
- **File theft:** guess `.bak`/`.old`/`backup.zip`; `../` escape; no directory listing. *(TG 4.2.4, 4.5.1)*

### Database Server
- **SQL injection:** `'` in each input, watch for DB errors; `' or '1'='1` as password → fails; **sqlmap**; no DB details in errors. *(TG 4.7.5)*
- **Data tampering:** can't edit another user's record; locked data stays locked; app's DB account can't over-reach; every change logged with who+when. *(TG 4.5.3/.4, 4.10.3)*
- **Stored XSS:** test script in a comment/profile → plain text for other users & admin. *(TG 4.7.2)*
- **Data theft:** DB unreachable from the internet; default creds fail; basic user can't pull others' data; data encrypted at rest + in transit. *(TG 4.2.1, 4.4.2, 4.5.4, 4.9.4)*

> **Direct line to Skills:** the **AI prompt-injection test** is a complete **Skill-evaluation recipe** — feed malicious input (typed *and* hidden), assert no leak/tool-misuse, re-run after every change. And the **social-engineering ethics rule** ("approval before you start") is the line between a pen-test and an actual attack — true for apps *and* for probing AI systems.

---

## 11. PenTesting & the report template

**PenTesting** = a planned, permitted attack on your own app, acting like Evil Cake Corp across every layer, documenting what broke, how bad, and how to fix it. It goes *near launch as one last check* — not the only one.

**PenTest Report template (7 sections):**
1. **Background** — why, what app, who asked, when, who ran it. Short.
2. **Code Being Tested** — links to codebase + live app; main parts (screens, server, database).
3. **Scope** — what's tested / left out; all 5 software + 3 network layers.
4. **PenTest Audit** — one row per planned test: layer, network tier, OWASP risk, steps (start from the §10 checks).
5. **Findings** — one row per problem: name + **severity P0 (Critical) → P3 (Low)**, layer, weak spot, attacker impact, principles to apply, cheat sheets to read.
6. **Recommendations** — numbered fixes, most severe first; each says what to change and which finding it solves.
7. **BDD** — Given/When/Then proving each fix; added to CI/CD so it can't return.

---

## 12. The big through-lines (the 5 things to actually retain)

1. **CIA is the frame** — every threat is a hit on Confidentiality, Integrity, or Availability.
2. **Defense in Depth** — never one layer; always many.
3. **The injection family** — XSS, prompt injection, command injection, SQL injection are one idea: *untrusted input treated as a command.* "Never trust the user" is the cure at every layer.
4. **The build-and-test loop** — threat model → testable requirements → acceptance criteria + BDD → secure code via cheat sheets → blocking CI/CD checks → monitor & repeat.
5. **It's the same loop for Claude Skills** — encode a cheat sheet *as* a Skill so the agent follows it; write eval cases (incl. hidden-injection inputs) to prove it; gate it so a failure blocks. Your study material and your build pipeline are the same discipline.

---

## 13. How this maps to your Week 6 assignment
- **Research report (3–5 pp + deck)** on *one* software layer → draw from §5 (surfaces/vectors for that layer), §6 (OWASP rules), §9 (secure-coding steps for its layer).
- **Full PenTest report** → use §11's template, populate the Audit/Findings from §10's per-layer test checks, write fixes as requirements (§9) in Notion.
