---
name: responsible-ai
description: Enforces responsible-AI practices on any AI-powered feature — map the stakes and prohibited uses before building, keep a named human accountable for consequential decisions, disclose AI involvement, ground outputs against fabrication, check for bias and unfair harm, govern the data sent to a model, and log and monitor AI use. Use when building, reviewing, or shipping anything that uses an AI model or agent — a prompt, chatbot, agentic workflow, generated content, a recommendation, or an automated decision that affects a person. Grounded in the NIST AI Risk Management Framework. Do NOT use for the technical mechanics of protecting data (use secure-coding), for systematically measuring output quality (use ai-evaluation), or for where guardrails sit in the architecture (use judge-arch).
metadata:
  version: 1.0
---

# Responsible AI

## Intent

Build AI features that help the people they touch without harming them. Responsibility is a
requirement designed in from the first prompt, not a filter bolted on at the end. This skill is
a build-time gate for *how we build* any AI-powered feature — distinct from a product's own
governance features, though the same rules inform both. It is grounded in the **NIST AI Risk
Management Framework** (AI 100-1) and its Generative AI Profile, organized by the four NIST
functions: **Govern, Map, Measure, Manage.**

## Govern — accountability and transparency come first

1. **Name a human accountable for the feature.** Every AI feature has one named owner responsible
   for its outcomes. "The model decided" is never an answer. Govern is the bedrock the other three
   functions rest on.
2. **Write the rules down — and record the costly ones as ADRs.** The feature's allowed uses,
   limits, and review requirements are recorded, not held in someone's head. A responsible-AI
   decision that is costly to reverse — "this AI will never score or rank people," how the
   human-review gate works, what data may reach a model — is an ADR, same as any other
   architectural decision ([[technical-planning]]).
3. **Disclose AI involvement.** Tell people when AI meaningfully shaped content or a decision about
   them, and label AI-generated output as AI-generated. Disclosure is the default, not a courtesy.

## Map — know the stakes before you build

4. **State the intended use, the affected people, and the stakes** before building. Who is helped,
   who could be harmed, and how bad is the worst case? High-stakes (someone's rights, services,
   health, liberty, or livelihood) raises every bar below.
5. **Write the prohibited uses explicitly.** Name what this feature must *not* do. In particular,
   do not build AI that **scores, ranks, or predicts outcomes about people** (e.g. risk or
   eligibility scoring) — a known third-rail harm and a prohibited/high-risk practice under the EU
   AI Act; keep AI on the work, not on judging the person.

## Measure — check for harm before shipping

6. **Design for fabrication, don't assume accuracy.** Treat hallucination as a governance risk, not
   just a quality bug. Require sources or retrieval for factual claims, surface uncertainty, and
   make outputs easy to verify. Never present ungrounded generation as established fact. (Systematic
   output-quality measurement — eval sets, rubrics, LLM-as-judge — is [[ai-evaluation]]'s job.)
7. **Check for bias and unfair harm.** Consider how the feature could treat groups differently or
   produce stigmatizing or demeaning output. Test with diverse and edge-case inputs, not just the
   happy path. Off-the-shelf safety filters miss intent — inspect real outputs. (Fairness here means
   across groups; UI access for disability is [[accessibility]].)
8. **Govern the data the model sees.** Send a model only data appropriate for AI processing, minimize
   it, and obtain consent when the data is about people. Whether data *should* reach the AI is this
   skill's call; the mechanics of protecting it — PII handling, secrets, access control — are
   [[secure-coding]].

## Manage — keep a human in control, and watch it in the wild

9. **Keep a human in the loop for consequential decisions.** AI output must never be the *sole* basis
   for a decision affecting a person's rights, services, or well-being. Design an explicit
   review-and-approve gate a named human can override before the action takes effect (human oversight,
   EU AI Act Art. 14; OECD and UNESCO human-determination principles).
10. **Define the guardrails the system must enforce** — refusal boundaries, prohibited outputs, the
    policy limits it operates within. This skill defines *what* guardrails must exist; *where* they
    live in the architecture is [[judge-arch]].
11. **Log AI use for accountability.** Record what the AI did, the decision, and who approved it — an
    audit trail a person could later review. Keep secrets and personal data out of the logs
    ([[secure-coding]]).
12. **Monitor after launch and keep an off switch.** Watch for drift, harmful outputs, and complaints
    once real users arrive, and keep a way to roll back or disable the feature fast.

## Checklist before calling an AI feature "done"

- [ ] A named human owns the feature's outcomes; its rules are written down (costly ones as ADRs)
- [ ] AI involvement is disclosed; AI-generated output is labeled
- [ ] Intended use, affected people, stakes, and prohibited uses are stated
- [ ] No scoring/ranking/predicting outcomes about people
- [ ] Factual outputs are grounded/sourced; uncertainty is surfaced; nothing ungrounded is shown as fact
- [ ] Bias checked against diverse and edge-case inputs, on real outputs
- [ ] Only appropriate, minimized, consented data reaches the model
- [ ] A human review-and-override gate exists for consequential decisions
- [ ] Guardrails (refusals, prohibited outputs, policy limits) are defined
- [ ] AI use is logged (no secrets/PII); monitoring and a rollback/off switch are in place

## When unsure

If the feature could affect someone's rights, services, health, or livelihood, treat it as
high-stakes: add the human gate and say so explicitly rather than assuming the model is safe enough.
If you're tempted to let AI judge, score, or rank a person, stop — that's the prohibited use in
rule 5. If a harm is non-obvious (a subtle bias, a group you didn't test), flag it for review rather
than shipping on "looks fine." Defer data-protection mechanics to [[secure-coding]], systematic
output evaluation to [[ai-evaluation]], and guardrail placement to [[judge-arch]].

## Based on

Primary standards and intergovernmental frameworks first; practitioner methods for the operational
rules; vendor frameworks last and labeled as such.

- **NIST AI Risk Management Framework (AI 100-1, 2023)** and its **Generative AI Profile
  (NIST-AI-600-1, 2024)** — the Govern / Map / Measure / Manage spine; Govern as the cross-cutting
  bedrock (nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf; nist.gov/itl/ai-risk-management-framework)
- **OECD AI Principles (2019, revised 2024)** — first intergovernmental AI standard: accountability,
  transparency, human oversight, robustness
- **UNESCO Recommendation on the Ethics of AI (2021)** — the global ethics/values layer (fairness,
  human determination, transparency)
- **EU AI Act — Regulation (EU) 2024/1689** — risk-based tiers (prohibited / high-risk / limited);
  human oversight (Art. 14) and transparency (Art. 50). Cited for its *structure*, not specific
  phase-in dates (which are shifting under the Digital Omnibus).
- **ISO/IEC 42001:2023** (AI management system) and **ISO/IEC 23894:2023** (AI risk management) —
  the govern/management-system backbone
- **Barocas, Hardt & Narayanan — *Fairness and Machine Learning*** (fairmlbook.org) — the bias rule
- **Microsoft *Guidelines for Human-AI Interaction* (Amershi et al., CHI 2019) / HAX Toolkit** and
  **Google PAIR *People + AI Guidebook*** — human-in-the-loop and verify/uncertainty design
- *Vendor frameworks (convergent but self-interested):* Microsoft Responsible AI Standard; Google AI
  Principles; **Anthropic Usage Policy + Responsible Scaling Policy** (relevant because the product
  runs on Claude — model-specific safety)
- *Caveat:* a revision of NIST AI RMF 1.0 may be in progress; re-check nist.gov before relying on a
  specific version.
- Composes with [[secure-coding]] (data protection), [[ai-evaluation]] (output measurement),
  [[judge-arch]] (guardrail placement), [[accessibility]] (UI access), and [[technical-planning]]
  (responsible-AI requirements become non-functional requirements and ADRs)

## Examples

**Consequential decision — ❌ AI decides vs ✅ human-in-the-loop**
- ❌ An agent auto-sends a benefits-denial message to a client based on the model's read of a case note.
- ✅ The agent drafts the message and flags its reasoning; a named caseworker reviews, can override, and approves before anything is sent — and the approval is logged.

**Factual claim — ❌ ungrounded vs ✅ grounded + verifiable**
- ❌ The assistant states a program's eligibility rule from the model's memory, with no source.
- ✅ It cites the source document for the rule, shows the passage, and flags "unverified" when it has none.

**Prohibited use — ❌ scoring people vs ✅ AI on the work**
- ❌ A feature ranks clients by "likelihood to succeed" to prioritize who gets help.
- ✅ The feature drafts and organizes the caseworker's notes; the human decides priorities.
