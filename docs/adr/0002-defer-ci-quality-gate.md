# ADR-0002: Defer the CI quality gate to the app-building weeks

- **Status:** Accepted
- **Date:** 2026-10-28

## Context
The "quality sandwich" pattern pairs front-end skill enforcement (at generation time) with
a back-end CI gate (on push) so unverified or broken code never reaches `main`. Today only
the front-end half exists: skills enforce at generation, but there is no automated gate on
push, and commits go directly to `main`.

The forces in tension:

- **Automated enforcement** would guarantee broken work stays off `main`, deterministically.
- **YAGNI.** The repository today is almost entirely Markdown skills and docs — there is
  very little executable code for CI to check. The code that justifies a gate arrives in
  Weeks 3–8 (web app, AI chatbot, PWA / microservices).

## Decision
Do not add CI now. Stand up a GitHub Actions gate when the app code lands (Weeks 3–8). Its
binary pass/fail checks will come from skills that already exist: `testing-code-review`
(tests pass), `secure-coding` (no secrets / injection), `technical-planning` (non-functional
requirements as pass/fail).

## Alternatives considered
- **Add CI now** (lint / format / Markdown link-check) — rejected: low value for a
  docs-and-skills repo, maintenance cost without real protection; YAGNI.
- **Never add CI, rely on skills + review only** — rejected: once real code ships,
  generation-time enforcement alone cannot guarantee broken code stays off `main`; the
  back-end gate is the missing half of the quality sandwich.

## Consequences
- **Positive:** no premature infrastructure; CI arrives when it protects real code, wired to
  skills we already have.
- **Negative (the point):** until then, nothing *automated* stops broken or unverified work
  reaching `main` — mitigated only by the skills and the review gate, which are
  instruction-strength, not deterministic. **This decision must be revisited at the start of
  Week 3;** if it slips, the gap persists silently.
- **Neutral:** this is a timing decision, not a rejection of CI.
