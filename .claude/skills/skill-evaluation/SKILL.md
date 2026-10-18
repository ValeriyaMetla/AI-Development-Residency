---
name: skill-evaluation
description: Evaluates whether a Claude Skill actually works — testing it against a no-skill baseline, writing verifiable assertions, checking triggering accuracy, and iterating on real usage before trusting it. Use whenever creating, reviewing, improving, or deciding whether to keep a skill, whenever writing SKILL.md test cases, or whenever someone asks whether a skill helps, triggers, or is worth its context cost — even if they don't say "evaluate." Do NOT use for evaluating code or pull requests (use testing-code-review), or for evaluating model/LLM outputs — this skill is specifically for evaluating Skills.
---

# Skill Evaluation

## Intent

A skill is instructions Claude follows blindly, so a weak skill quietly degrades every task that triggers it. Don't trust a skill because it reads well — prove it helps. This skill covers how to evaluate a SKILL before relying on it. Grounded in Anthropic's `skill-creator` and the official Skill authoring best practices.

## Measure against a baseline — this is the core move

1. **Always compare with-skill vs. without-skill.** Run the same realistic task twice: once with the skill loaded, once with no skill (baseline). The skill earns its place only if the with-skill output is clearly better. A skill that doesn't beat baseline is noise.
2. **Be evaluation-driven: write the evals before writing lots of content.** First run Claude on representative tasks *without* the skill and note the specific failures. Build the skill to fix *those real gaps*, not imagined ones.

## Write test cases a real user would actually type

3. **Use 2–3 concrete, realistic prompts** — with specifics (file names, column values, context, casual phrasing), not abstract stubs like "format this data." The skill must work for the unseen thousandth case, so the prompts should represent the real distribution, not your favorite example.
4. **Write objectively verifiable assertions where the output allows it** (a file was produced, it contains X, the format matches, the number is correct). For subjective skills (writing style, design, tone), prefer human judgment — don't force brittle assertions onto things that need taste.

## Test triggering separately from quality

5. **The description is the primary trigger — test it on its own.** Create should-trigger and should-**not**-trigger queries. The valuable negatives are *near-misses* (share keywords but need something else), not obviously-unrelated prompts.
6. **Watch for under-triggering.** Claude tends to skip skills it would benefit from, and only consults skills for tasks it can't easily handle alone. If a good skill rarely fires, the fix is almost always the **description**, not the body.

## Judge cost, not just correctness

7. **Weigh quality against tokens and time.** A skill that helps a little but bloats context or slows the task may not be worth it. Read the transcripts, not just the final output — if the skill makes Claude waste steps, cut the parts causing it.

## Iterate on observed behavior, then decide

8. **Improve from how a fresh Claude actually uses the skill** (the "Claude A writes / Claude B uses" pattern). Generalize from feedback — fix the underlying issue, don't overfit tweaks to your handful of test cases.
9. **Test on the model(s) you'll actually use.** Haiku may need more guidance than Opus; what works for one can under- or over-explain for another.
10. **Record a verdict: keep, revise, or cut.** State the evidence. Revising the description fixes triggering; revising the body fixes behavior; cutting is the right call when the skill doesn't beat baseline.

## Checklist before trusting a skill

- [ ] 2–3 realistic test prompts (what a real user would type)
- [ ] A no-skill baseline run to compare against
- [ ] Assertions are objectively verifiable (or qualitative if the output is subjective)
- [ ] Triggering tested: should-trigger **and** near-miss should-not-trigger queries
- [ ] Tested on the model(s) actually in use
- [ ] Quality weighed against token/time cost (transcripts read, not just outputs)
- [ ] Improvements generalize — not overfit to the test prompts
- [ ] Verdict recorded: keep / revise / cut, with evidence

## When unsure

If the skill's output is subjective, trust human review over invented metrics. If the skill helps but rarely triggers, change the description before touching the body. And if two iterations don't make it beat baseline, cutting it is a valid, often correct outcome — a skill that doesn't earn its context is worse than none.

## Based on

- Anthropic `skill-creator` — draft → test (with-skill vs. baseline) → review → iterate → description optimization
- Skill authoring best practices — evaluation-driven development, triggering, degrees of freedom, cost (platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
