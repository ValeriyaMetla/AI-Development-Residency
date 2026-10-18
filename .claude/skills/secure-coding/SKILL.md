---
name: secure-coding
description: Enforces secure coding defenses against the OWASP Top 10 — access control, encryption, injection prevention, safe secrets handling, and input validation. Use when writing, reviewing, or modifying code that handles user input, authentication, passwords, secrets, API keys, access control, file uploads, database queries, external requests, or data from any untrusted source. Do NOT use for general test coverage or code-review quality (use testing-code-review).
---

# Secure Coding

## Intent

Apply these practices whenever code touches untrusted input, credentials, access decisions, or sensitive data. Security is not a final step — build it in from the first line. This skill is grounded in the OWASP Top 10 and OWASP Secure Coding Practices.

## Core rules (mapped to the OWASP Top 10)

1. **Enforce access control on every request (A01 — the #1 risk).** Check that the user is authorized for the specific action and resource, server-side, every time. Deny by default. Never rely on hiding a button in the UI.
2. **Protect sensitive data with strong cryptography (A02).** Encrypt sensitive data in transit (HTTPS/TLS) and at rest. Hash passwords with a strong, salted algorithm (bcrypt, argon2, scrypt). Never store or log raw passwords.
3. **Prevent injection (A03).** Use parameterized queries / prepared statements — never concatenate user input into SQL or commands. Escape user data shown in HTML to prevent XSS.
4. **Design securely from the start (A04).** Validate all input (type, length, format, range). Think through how a feature could be abused before building it; flag risky flows early.
5. **Configure securely (A05).** Use secure defaults, disable debug/verbose errors in production, remove default accounts, and never commit secrets — read them from environment variables or a secrets manager, and keep them in `.gitignore`.
6. **Keep components updated (A06).** Use maintained libraries, track dependencies, and update when known vulnerabilities (CVEs) are reported. Avoid unmaintained packages.
7. **Authenticate and manage sessions safely (A07).** Enforce strong authentication, protect against brute force, expire sessions, and support multi-factor auth where it matters.
8. **Log and monitor security events (A09) — but never log secrets.** Record auth successes/failures and access-control failures so incidents can be detected. Keep passwords, tokens, and personal data out of logs.
9. **Fail securely and least privilege.** On error, deny access and reveal nothing sensitive. Give every user, service, and process the minimum access it needs.

## Checklist before calling security "done"

- [ ] Every sensitive action checks authorization server-side (access control)
- [ ] Sensitive data is encrypted in transit and at rest
- [ ] All queries are parameterized; output is escaped
- [ ] All external input is validated before use
- [ ] No secrets in the code or git history
- [ ] Dependencies are current and free of known vulnerabilities
- [ ] Passwords are hashed with a strong algorithm; sessions expire
- [ ] Security events are logged, and logs contain no secrets
- [ ] Errors reveal nothing sensitive and deny by default

## When unsure

If a security decision is non-obvious (crypto choices, auth flows, access-control design, handling regulated data), say so explicitly and recommend a security review rather than guessing. It is better to flag a risk than to hide it.

## Based on

- OWASP Top 10 (2021) — owasp.org/Top10
- OWASP Secure Coding Practices — Quick Reference Guide
