---
name: documentation
description: Enforces clear, maintainable documentation — READMEs, code comments, and API/reference docs — using the Diátaxis framework and proven developer-doc practices so others can understand and maintain the code. Use when writing or updating a README, docstrings, code comments, API references, guides, or any explanation of how code works or how to use it.
---

# Documentation

Good documentation lets someone else (including future you) understand and use the code without asking. Write for the reader, keep it current, and match each piece to its purpose. This skill follows the Diátaxis framework and established developer-documentation practices.

## Know which of the four doc types you are writing (Diátaxis)

1. **Keep the four types separate — don't mix them.**
   - **Tutorial** (learning): a step-by-step path for a newcomer to a concrete result.
   - **How-to guide** (a task): concise steps for someone who knows the basics and wants one job done.
   - **Reference** (facts): dry, complete, accurate details of the machinery — no teaching.
   - **Explanation** (understanding): the background and the *why* behind a design.
2. **Don't let one type creep into another.** The common failure is explanation leaking into a how-to guide — move it to its own page and link instead.

## READMEs

3. **Lead with purpose.** Say what the project does and the problem it solves *before* installation steps.
4. **Orient the newcomer.** Cover what's here, which files to read first, how to set it up and run it, and who maintains it.

## Comments and API docs

5. **Comments explain *why*, not *what*.** The code already shows what it does; comments add the reasoning the code can't express. Remove or update stale comments and TODOs.
6. **Treat API/reference docs as the contract.** For each function or method, document its arguments, return value, errors/exceptions, and any restrictions. Documented behavior should ideally have a test verifying it.
7. **Show the simplest use case first** in class/module overviews, with a short example.

## Keep it maintainable

8. **Fight drift — keep docs current.** Update documentation in the same change as the code it describes. Outdated docs are worse than none.
9. **Don't duplicate; link.** Don't rewrite a guide to a common tool or process — link to the existing one.

## Checklist before calling documentation "done"

- [ ] Each page is clearly one Diátaxis type, not a mix
- [ ] The README leads with what the project does and why
- [ ] Setup/run steps and maintainer are included
- [ ] Comments explain *why*; stale comments/TODOs are cleaned up
- [ ] API docs list arguments, returns, and errors
- [ ] Docs were updated alongside the code change
- [ ] No duplicated content that could drift — linked instead

## When unsure

If you can't tell which doc type a page is, it is probably mixing two — split it. If documenting a complex or non-obvious design decision, capture the *why* in an explanation doc so the reasoning isn't lost.

## Based on

- Diátaxis framework (Daniele Procida) — tutorials, how-to guides, reference, explanation (diataxis.fr)
- Developer documentation best practices — Google/Chromium engineering docs
