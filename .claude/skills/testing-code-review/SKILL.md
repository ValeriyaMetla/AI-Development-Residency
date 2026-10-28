---
name: testing-code-review
description: Enforces meaningful automated testing (testing pyramid) and rigorous code review (Google's review priorities) so changes are correct, maintainable, and verified before they ship. Use when writing tests, reviewing a pull request or diff, checking a change for bugs, or deciding whether code is ready to merge. Do NOT use as the authority on security specifics — consult secure-coding for those.
metadata:
  version: 1.0
---

# Testing & Code Review

## Intent

Quality comes from verifying work, not assuming it. This skill covers two jobs: writing automated tests (based on the testing pyramid) and reviewing code (based on Google's engineering practices). Apply them before calling any change "done."

## Writing tests — follow the testing pyramid

1. **Many unit tests at the base.** Fast, isolated tests for individual functions and components. These are cheap and stable — write the most of these.
2. **Fewer integration tests in the middle.** Test how parts work together (code + database/API) with realistic data. Cover both the happy path and error paths.
3. **A few end-to-end tests at the top.** Cover only critical user journeys — E2E tests are slow and brittle, so keep them focused.
4. **Test meaningfully, not for a number.** Don't chase 100% coverage with empty tests. A good test fails when the behavior actually breaks.
5. **Keep tests deterministic.** No flaky tests from timing, order, or external state. Automate all layers so they run in CI on every change.

## Reviewing code — Google's priorities, in order

6. **Design first.** Does the change fit the system? Does it belong here? Is it the right approach?
7. **Functionality.** Does it do what was intended, for both end-users and future developers? Are edge cases and error conditions handled?
8. **Complexity.** Can each piece be understood quickly? Is it over-engineered or solving problems that don't exist yet? Simpler is better.
9. **Tests.** Are there appropriate tests, and would they actually fail if the code broke?
10. **Naming, comments, consistency.** Clear, descriptive names. Comments explain *why*, not *what*. Code matches the surrounding style and conventions.
11. **Review every line, in context.** Understand each change; look beyond the diff at the whole file. Ask for clarification on anything unclear. Flag that specialized areas (security, concurrency) get a qualified review.
12. **Acknowledge good work.** Call out improvements and good practices, not only problems.

## Checklist before calling a change "done"

- [ ] Unit tests cover the core logic; integration tests cover key interactions
- [ ] Critical user paths have an end-to-end test
- [ ] Tests are meaningful and would fail if the behavior broke
- [ ] Tests are deterministic and run in CI
- [ ] The design fits the system and is no more complex than needed
- [ ] Edge cases and error paths are handled
- [ ] Names are clear; comments explain why; style is consistent
- [ ] Every changed line is understood, not just skimmed

## When unsure

If a change touches a specialized or high-risk area (security, concurrency, data integrity), say so and recommend a qualified reviewer rather than approving on general grounds. Prefer flagging a gap over waving a change through.

## Based on

- The Testing Pyramid (Mike Cohn) — unit / integration / end-to-end balance
- Google Engineering Practices — "What to look for in a code review" (google.github.io/eng-practices)
