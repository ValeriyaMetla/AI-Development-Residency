---
name: secure-coding
description: Enforces secure coding against the OWASP Top 10 (2025) — server-side access control and least privilege, stopping the injection family (XSS, prompt, command, SQL injection) by treating untrusted input as data, safe secrets and configuration, supply-chain hygiene, safe file handling, rate limiting, failing safely, and turning each threat into a plain, testable security requirement. Use when writing, reviewing, or modifying code that handles user input, authentication, sessions, passwords, secrets, API keys, access control, row-level security, file uploads, database queries, shell commands, external requests, AI/LLM prompts or tool calls, or any untrusted data; and when writing security requirements or security acceptance criteria for a feature — even if the user doesn't say "security." Do NOT use for running a pentest or threat-model test plan (use security-testing), general test coverage (use testing-code-review), or AI ethics and disclosure (use responsible-ai).
metadata:
  version: 2.0
---

# Secure Coding

## Intent

Build defenses into code from the first line, in every layer, because security added at the end
misses most problems and a leak can never be taken back. Grounded in the OWASP Top 10:2025, the
OWASP Cheat Sheet Series (including the LLM Prompt Injection Prevention Cheat Sheet), and OWASP
Secure Coding Practices.

## Rules

1. **Never trust the user — the root rule.** Treat every input as a possible attack: form fields,
   URL params, headers, cookies, uploaded files, webhooks, third-party API responses, and anything
   an AI model reads or writes. The server validates type, length, format, and range itself;
   the browser never decides what is allowed, because anyone can edit what the browser sends.
2. **Stop the injection family by keeping input as data (A05).** XSS, prompt injection, command
   injection, and SQL injection are one bug at four layers — untrusted input executed as a
   command. Defend at each layer: **presentation** — escape output and avoid raw-HTML sinks
   (`innerHTML`, `dangerouslySetInnerHTML`); **service/AI** — see rule 10; **domain/server** —
   never build shell commands from input, pass arguments as arrays; **data source** —
   parameterized queries or the ORM's bound parameters, never string-concatenated SQL. Query
   builders that take a filter *string* (e.g. Supabase/PostgREST `.or()`) are the same sink:
   pass input as a bound value or a parameterized database function, since stripping
   characters misses the syntax you didn't think of.
3. **Enforce access control on the server, every request, with least privilege (A01).** Check the
   user may do *this* action on *this* record, deny by default, and never rely on hiding a button
   or an ID in the URL. On a client-reachable database (e.g. Supabase/Postgres), enable row-level
   security on every table with explicit policies, because the publishable client key lets anyone
   query tables RLS doesn't guard. Give every user, service, and database role the minimum access
   it needs, so a stolen login can only do a little.
4. **Configure securely (A02).** Secure defaults, debug and verbose errors off in production,
   default accounts removed, HTTPS only, security headers set (CSP, HSTS, frame-ancestors,
   no-sniff), private pages sent `Cache-Control: no-store`, and the database unreachable from the
   open internet except through its intended API. Write the configuration as a checklist so every
   environment is set up the same.
5. **Guard the supply chain (A03).** Commit a lockfile, prefer maintained packages, check
   dependencies for known vulnerabilities, and pin external scripts with Subresource Integrity —
   a compromised library runs with your app's full access.
6. **Use proven cryptography (A04).** TLS in transit, encryption at rest for sensitive data,
   passwords hashed with argon2/bcrypt/scrypt. Never invent crypto or store raw passwords.
7. **Authenticate and manage sessions safely (A07).** Lock out or slow repeated failed logins,
   expire idle sessions, invalidate tokens on logout, set cookies `Secure`, `HttpOnly`, and
   `SameSite`, and offer MFA where the stakes warrant it.
8. **Keep secrets and logic out of the client.** Secrets live in environment variables or a vault,
   never in code, git history, or variables the framework ships to the browser (e.g. Next.js
   `NEXT_PUBLIC_*`). Only publishable keys reach the browser; admin keys (e.g. a Supabase
   service-role key) and model API keys stay server-side. Never describe security logic in client
   code or comments — anyone can View Source, and hiding how it works is not a defense on its own.
9. **Handle files and paths as hostile.** Check uploads by actual content type and size, not the
   file extension; store them outside the web root under generated names; never build a file path
   from input (block `../`); and don't leave backups or directory listings reachable — an
   attacker will guess `.bak`, `.old`, and `backup.zip`.
10. **Treat AI input and output as untrusted (prompt injection).** Injection arrives *directly* (a
    user typing "ignore your rules") and *indirectly* (instructions hidden in files, pages,
    retrieved documents, or tool output the model reads — including text invisible when
    rendered). Keep trusted instructions apart from untrusted content, but treat that separation
    as formatting, not enforcement. Enforce what the model may do in code: validate every tool
    call and argument against the user's own permissions, give each tool least privilege
    (read-only where possible), and require human approval of the exact action before anything
    consequential runs. Treat model output as untrusted wherever it is used next — escape it,
    never execute it, and check it for a leaked system prompt or keys. Input filters and
    guardrail models are useful extra layers and logging aids, but not the boundary, because a
    filter cannot stop an attack it fails to detect.
11. **Protect availability.** Rate-limit APIs, logins, and expensive operations per user or IP —
    model calls especially, since each one also costs money — and set timeouts and request-size
    limits, so one caller can't take the app down for everyone.
12. **Protect integrity (A08).** Don't deserialize or execute untrusted data, verify the source of
    code and updates, require CSRF protection on state-changing requests, and lock down who can
    change the CI/CD pipeline.
13. **Fail safely (A10) and log without leaking (A09).** On an unexpected error, stop, show a
    short generic message, and treat the user as having no access; send details to a private log.
    Log and alert on auth failures, access-control denials, and changes to sensitive records with
    who and when — never passwords, tokens, or personal data.
14. **Turn threats into plain, testable requirements (A06).** For each threat from the threat
    model, write at least one rule in plain words with a pass/fail test, never "make it secure."
    Source the guard from the matching OWASP cheat sheet, add it to the acceptance criteria with a
    Given/When/Then scenario that includes the attacker's path, and make it a CI check that
    *blocks* the merge. Hand the cheat sheet to the AI coding tool and check its code against it.
15. **Defense in depth, one owner per check.** Guard the same asset in several layers so one
    failure doesn't open the door, but implement each check once (one auth middleware, one
    query layer) so it can't drift — scattered copies are where gaps appear.

## Checklist before calling security "done"

- [ ] Every input point is validated server-side; nothing relies on client checks
- [ ] Output is escaped; queries are parameterized; no shell commands are built from input
- [ ] Every sensitive action checks authorization server-side; RLS is on for every table; roles are least-privilege
- [ ] No secrets in code, git history, or client bundles; no security logic in client comments
- [ ] Production config: debug off, HTTPS only, security headers set, private pages not cached
- [ ] Dependencies are locked and free of known vulnerabilities; external scripts use SRI
- [ ] Passwords hashed; sessions expire; cookies Secure + HttpOnly + SameSite; failed logins throttled
- [ ] Uploads checked by content and size; no file paths built from input; no backups reachable
- [ ] AI features: tool calls validated in code against the user's permissions; consequential actions need approval; output treated as untrusted
- [ ] APIs and model calls are rate-limited with timeouts and size limits
- [ ] Errors are generic and deny by default; security events are logged without secrets
- [ ] Each threat has a plain, testable requirement with a BDD scenario and a blocking CI check

## When unsure

- If a decision is non-obvious (crypto choice, auth flow, access-control design, regulated data),
  say so and recommend a security review rather than guessing — a flagged risk beats a hidden one.
- If you're unsure which guard applies, open the matching OWASP cheat sheet before writing code.
- If a fix relies on secrecy ("no one will find this URL"), it isn't a fix — add a real control.
- If the task is to *find* vulnerabilities in existing code or plan a pentest, switch to
  security-testing.

## Based on

- **OWASP Top 10:2025** — top10.owasp.org/2025
- **OWASP Cheat Sheet Series** — cheatsheetseries.owasp.org: LLM Prompt Injection Prevention,
  File Upload, and Denial of Service cheat sheets
- **OWASP Secure Coding Practices — Quick Reference Guide**
- Tech Fleet AI Development Residency, Week 6 Information & Network Security material
- Composes with [[security-testing]] (finds what these rules should have stopped),
  [[testing-code-review]], and [[responsible-ai]]
