---
name: secure-coding
description: Use when writing, reviewing, or modifying code that handles user input, authentication, passwords, secrets, API keys, file uploads, database queries, or data from any external source. Enforces input validation, safe secrets handling, and protection against common vulnerabilities (injection, XSS, broken auth).
---

# Secure Coding

Apply these practices whenever code touches untrusted input, credentials, or sensitive data. Security is not a final step — build it in from the first line.

## Core rules

1. **Never trust input.** Validate and sanitize everything that comes from users, URLs, files, APIs, or other systems. Check type, length, format, and range before using it.
2. **Never hardcode secrets.** No passwords, API keys, or tokens in source code. Read them from environment variables or a secrets manager. Confirm secrets are listed in `.gitignore`.
3. **Use parameterized queries.** Never build SQL (or any query) by concatenating strings with user input — use prepared statements / parameter binding to prevent injection.
4. **Escape output.** When showing user-supplied data in HTML, escape it to prevent cross-site scripting (XSS). Prefer framework auto-escaping.
5. **Hash passwords, never store them plainly.** Use a strong, salted algorithm (bcrypt, argon2, scrypt). Never log or email a raw password.
6. **Fail securely.** On error, deny access by default. Don't leak stack traces, secrets, or internal details in error messages shown to users.
7. **Least privilege.** Give code, users, and services only the minimum access they need.

## Checklist before calling security "done"

- [ ] All external input is validated before use
- [ ] No secrets appear in the code or git history
- [ ] Database access uses parameterized queries
- [ ] User data shown in the UI is escaped
- [ ] Passwords are hashed with a strong algorithm
- [ ] Error messages reveal nothing sensitive

## When unsure

If a security decision is non-obvious (crypto choices, auth flows, handling regulated data), say so explicitly and recommend a review rather than guessing. It is better to flag a risk than to hide it.
