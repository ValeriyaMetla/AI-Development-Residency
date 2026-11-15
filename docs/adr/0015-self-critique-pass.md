# ADR-0015: Self-critique is a model-based "Challenger" pass with a bounded re-draft, behind the deterministic rule-check

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Epic 3's governed-run pipeline (`lib/domain/pipeline.ts`) has carried a **stubbed** self-critique
step since the Release-1a walking skeleton (`self-critique stubbed (Phase 2)`). Release 1b, Chunk 1
("Build the self-critique pass") replaces it with a real "Challenger": between the draft and the
rule-check, the Skill checks its own output for errors and unsafe content so obvious problems are
caught before a person sees them (user story), and nothing reaches the user **unflagged**
(acceptance criterion).

The tension this ADR resolves is the same one ADR-0014 named: a genuine self-critique needs
**semantic judgment**, which only a model can do — but ADR-16 (Build Plan) requires guardrails to be
**code outside the model** so prompt injection (LLM01) cannot disable them. A model that judges AND
is the only guardrail is exactly what ADR-0014 rejected. So the question is not "model or code" but
**how the model-based critique and the deterministic check compose**, and how the critique behaves
when it finds a problem or when it fails.

## Decision

1. **The self-critique is a model-based pass, kept separate from the deterministic backstop.** It
   runs the model (via the Data-Source layer, `draftWithClaude`) to review the draft, then the
   deterministic `ruleCheck` (ADR-0014, code outside the model) runs **afterward on the final text**.
   The two findings are combined **most-severe-wins** (`block > flag > pass`) by `mostSevere()` in
   `guardrails.ts`. The model never gets the last word; it can only *add* caution, never remove the
   deterministic check.
2. **Pure Domain, with the model call injected by the pipeline.** `lib/domain/self-critique.ts` is
   I/O-free: it builds the critique prompt, **parses the model's structured verdict defensively**,
   and maps the verdict to a guardrail finding. The pipeline makes the single model call. This keeps
   the risky part — prompt-building and response-parsing — fully unit-testable without the SDK
   (ADR-0027), mirroring the Co-Pilot's `copilot.ts` / `copilot-pipeline.ts` split (ADR-0010).
3. **Structured verdict: `pass` / `revise` / `block`** with a one-sentence plain reason, requested as
   a strict JSON object and parsed tolerantly (code-fence/prose stripping, verdict validation).
   - `pass` → finding `pass`.
   - `revise` → the model supplies a corrected draft; the pipeline takes **ONE bounded re-draft**
     (the corrected text, no loop, no re-critique) and the finding is `flag` → `needs_review`, so a
     caught-and-fixed draft is still surfaced, never shown as final silently.
   - `block` → finding `block` → the run is blocked with the reason.
4. **Fail closed (ADR-0014 resilience).** A model error, a refusal, or an **unparseable** response
   yields a `flag` finding (→ `needs_review`) with a plain reason — never a silent `pass`, and never
   a hard block of the whole run.
5. **Recorded, no sensitive payload (ADR-5/6).** The self-critique result is saved as a
   `guardrail_check` row (`check_type = 'self_critique'`), summarized on `task_output`
   (`self_critique_result = "<verdict>: <reason>"`), and the **verdict** (not the content) is added
   to the `audit_event` payload. No schema change was needed — the columns already existed.

## Alternatives considered

- **Let the Challenger be the blocking guardrail (drop/representation of the deterministic check).**
  Rejected — against ADR-16/ADR-0014: a crafted input could talk the critic out of blocking. The
  deterministic rule-check stays as the injection-proof floor.
- **Flag-only, no re-draft.** Simpler, but the card calls for "one bounded regeneration," and a
  revised draft is materially more useful to the Doer. We kept the re-draft but **bounded it to one**
  and still route it to `needs_review`, so transparency is not traded for polish.
- **Critic and author as two separate model calls (critique, then a fresh regeneration).** More
  faithful role separation, but double the calls/latency for the same outcome; the single-call
  self-refine (verdict + corrected text together) is cheaper and still bounded. Revisit if revision
  quality proves weak.
- **Loop until clean (iterate critique→revise).** Rejected: unbounded cost/latency and a path to the
  model rationalizing its own output. One bounded re-draft, then the deterministic backstop, is the
  safe stopping rule.

## Consequences

- **Positive:** obvious errors/unsafe content are caught before human review; the deterministic
  guardrail is preserved and cannot be disabled by the model (most-severe-wins); parsing/prompt logic
  is pure and fully unit-tested; fails closed on any model trouble; no migration; consistent with
  ADR-0003 (layering — the SDK stays in Data-Source), ADR-0010 (engine/pipeline split), ADR-0014
  (deterministic backstop), ADR-5/6 (logged, no sensitive content).
- **Negative (accepted):** every governed run now makes a second model call (cost + latency), and a
  `revise` always adds a review step even after a good fix (friction, by design, for honesty). The
  critic can be wrong — over-flag a clean draft or miss a subtle issue — which is why it only ever
  raises caution and the human stays the final say (Chunk 2 approval gate).
- **Neutral / deferred:** measuring the Challenger's catch-rate as a named KPI (the card's
  `ai-evaluation` standard) is a follow-up eval, not part of this build; the tone check and the full
  Chunk-2 guardrails (PII, human-approval gate) remain separate cards.
