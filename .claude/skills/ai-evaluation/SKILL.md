---
name: ai-evaluation
description: Enforces disciplined evaluation of an AI model's or agent's OUTPUTS — define measurable success criteria, build an eval set of real and edge-case inputs, grade with the right method (code-based, LLM-as-judge, or human), score by rubric dimension rather than one average, validate the judge against human labels, and re-run as a regression gate on every prompt/model change. Use when evaluating, testing, measuring, or tuning the quality of an LLM or agent's answers — eval sets, rubrics, LLM-as-judge, groundedness/faithfulness, accuracy, regression checks for prompts or agents, or RAG answer quality. Do NOT use for evaluating a Skill (use skill-evaluation), for deterministic code tests and PR review (use testing-code-review), or for the ethics/harm gate and which qualities must be checked (use responsible-ai).
metadata:
  version: 1.0
---

# AI Evaluation

## Intent

An AI feature can demo well and still be wrong a fifth of the time; you cannot eyeball that. This
skill covers how to measure whether an LLM's or agent's **outputs** are actually good — the
non-deterministic counterpart to code tests. It is grounded in Anthropic's guidance on building
empirical evaluations, the LLM-as-a-judge literature (Zheng et al., 2023), rubric grading (G-Eval),
and RAG evaluation (RAGAS). The loop: **define good → build an eval set → grade → score by
dimension → validate the judge → re-run as a regression gate.**

## Define what "good" means — first, and measurably

1. **Write the success criteria before building evals.** Name the specific qualities that matter for
   this feature (e.g. verdict correctness, groundedness in the org's policy, no scoring of people).
   Each must be checkable; "be helpful" is not a criterion. *Which* qualities are required for a
   responsible feature is [[responsible-ai]]'s call — this skill measures them.
2. **Compare against a baseline.** A score means nothing alone. Measure against the current prompt,
   a simpler approach, or a prior version, so you know whether a change actually helped.

## Build the eval set

3. **Use real, representative inputs — including the hard ones.** Draw 20–50 cases from actual usage,
   bug reports, or support tickets; cover edge cases (irrelevant/missing data, very long input,
   ambiguous cases where even humans disagree), not just the happy path. Start small; grow it as
   failures surface.
4. **Hold the eval set fixed — no leakage.** Don't tune the prompt against the same examples you
   score on, and don't let test inputs leak into the prompt; that inflates scores without improving
   the feature. Keep a stable set so results are comparable over time.

## Grade — match the method to the task, cheapest first

5. **Code-based graders first.** For anything mechanical — valid JSON, an allowed enum value, an
   exact match, a regex, a number in range — use deterministic code. Fast, free, reproducible,
   easy to debug. Reserve the expensive methods for what code genuinely can't check.
6. **LLM-as-judge for open-ended quality.** For tone, groundedness, or free-form correctness, have a
   model grade the output against a written rubric (score each dimension) or by pairwise comparison
   (A vs B). Give the judge everything it needs to decide — e.g. a groundedness judge must see the
   retrieved context.
7. **Human grading to calibrate.** Use human review on a sample, mainly to check the automated judge
   agrees with a real person, and for genuinely subjective qualities where taste beats a metric.

## Score by dimension, not one average

8. **Report each quality separately.** Correctness, relevance, groundedness/faithfulness, and safety
   are different; a single blended number hides the dangerous one (an 0.80 average can conceal 0.55
   faithfulness). Track per-dimension pass rates, not one score.

## Trust the judge only after you validate it

9. **Measure the judge against human labels** before relying on it — agreement via Cohen's kappa
   (categorical) or correlation / mean-absolute-error (continuous). An unvalidated judge is an
   opinion, not a measurement.
10. **Pin the judge model and rubric version.** Treat a judge-model swap or rubric edit as a
    deliberate, recorded change, since scores aren't comparable across them. Watch the documented
    judge biases — **position** (favors the first option), **verbosity** (favors longer answers),
    and **self-preference** (favors its own style) — and mitigate (randomize order, control length).

## Evaluating RAG (when the feature answers from retrieved sources)

11. **Add the three RAG checks.** **Faithfulness** — is the answer inferable from the retrieved
    context (the hallucination check)? **Answer relevance** — does it address the question?
    **Context precision** — did retrieval pull the right material? Building the RAG pipeline itself
    is [[rag-retrieval]]; this skill evaluates its output.

## Make it a regression gate

12. **Re-run the eval set on every change** — prompt edit, model upgrade, agent change, judge change —
    and block a regression the same way a failing test blocks a merge. "Measure, don't guess." The
    eval *harness* as infrastructure/NFR is [[technical-planning]]; this skill defines what it runs.

## Checklist before trusting an AI feature's quality

- [ ] Measurable success criteria written down before evals
- [ ] A baseline to compare against (prior prompt / simpler approach / previous version)
- [ ] An eval set of 20–50 real + edge-case inputs, held fixed (no leakage)
- [ ] Mechanical checks graded by code; open-ended quality by LLM-as-judge; a human calibration sample
- [ ] The judge sees everything it needs (e.g. retrieved context for groundedness)
- [ ] Scores reported per rubric dimension, not one average
- [ ] The judge validated against human labels; judge model + rubric version pinned
- [ ] Judge biases (position / verbosity / self-preference) checked and mitigated
- [ ] RAG features also scored on faithfulness, answer relevance, context precision
- [ ] The eval set re-runs as a regression gate on every prompt/model/agent change

## When unsure

If a quality is subjective (voice, tone, design), trust a human sample over an invented metric. If
the judge and humans disagree a lot, fix the rubric or the judge before trusting any score. If you're
tempted to improve a number by editing the eval set, stop — that's leakage, not progress. Defer the
ethics gate and the list of qualities that *must* be checked to [[responsible-ai]], deterministic code
tests to [[testing-code-review]], evaluating a *Skill* to [[skill-evaluation]], building RAG to
[[rag-retrieval]], and the harness/NFRs to [[technical-planning]].

## Based on

Primary and peer-reviewed methods first; vendor guides last and labeled as such.

- **Anthropic — "Define success criteria and build evaluations," empirical performance evaluations,
  and the eval cookbook** — criteria-first evals; code-based vs model-based (self-)grading; test
  graders before trusting them (platform.claude.com/docs/en/test-and-evaluate; docs.anthropic.com).
  Primary because the product runs on Claude.
- **Zheng et al. (2023), *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*** — LLM-as-judge,
  pairwise comparison, and the position / verbosity / self-preference biases
- **Liu et al. (2023), *G-Eval*** — LLM rubric grading of generated text
- **Es et al. (2023), *RAGAS*** — reference-free RAG metrics: faithfulness, answer relevance,
  context precision/relevance
- **Stanford CRFM — HELM (Holistic Evaluation of Language Models)** — evaluate across many metrics,
  not a single score
- *Vendor guides (practitioner, commercial — illustrative):* Arize, Galtea, and similar LLM-eval
  write-ups
- Composes with [[responsible-ai]] (which qualities to measure + the ethics gate),
  [[testing-code-review]] (deterministic code tests), [[skill-evaluation]] (evaluating Skills),
  [[rag-retrieval]] (building RAG), and [[technical-planning]] (the eval harness as NFR)

## Examples

**Grader choice — ❌ wrong tool vs ✅ cheapest that works**
- ❌ Use an LLM judge to check whether the Co-Pilot returned one of "Proceed / Conditions / Do not proceed." *(A model call for what a one-line equality check settles — slow, costly, less reliable.)*
- ✅ Code-check the enum and JSON shape; use the LLM judge only for "is the rationale grounded in the policy?"

**Scoring — ❌ one average vs ✅ per dimension**
- ❌ "The thank-you drafter scores 0.82 overall." *(Hides that faithfulness to the real gift amount is 0.55.)*
- ✅ Correctness 0.95 · on-brand tone 0.90 · faithful to gift facts 0.55 — the 0.55 is the bug to fix.

**The judge — ❌ trusted blind vs ✅ validated**
- ❌ Ship a groundedness judge because its prompt reads well. *(It may just check the answer "sounds consistent.")*
- ✅ Label 30 outputs by hand, confirm the judge agrees (Cohen's κ), pin its model + rubric version, then trust it.
