# AI Development Residency

Weekly coding challenges and a premium-track product build, developed in collaboration
with AI (Claude Code) as part of the Tech Fleet **AI Development Residency**
(Oct 2026 – Feb 2027).

- **Specialization:** Advanced Agentic Workflows, with an AI Ethics layer woven in.
- **Premium product:** [Community AI Workflow Studio](#community-ai-workflow-studio) — the
  focus of this repository.
- **Maintainer:** [@ValeriyaMetla](https://github.com/ValeriyaMetla)
- **Status:** Early development. This is a prototype, not a production service.

> **Synthetic data only.** Do not enter real client, case, donor, or personal
> information anywhere in this project.

---

## Community AI Workflow Studio

**An org-aware, ethical AI workspace for nonprofits — one shared Org Brain, many
workflows, with responsible-AI guardrails built into every result.**

### The problem

Nonprofits have adopted AI widely but shallowly: surveys put adoption at 76–92%, yet
only ~7% report meaningful impact, and roughly two-thirds describe their use as
reactive, one-off prompting. Teams are stretched thin, governance is almost absent
(only ~7–10% have any AI policy), and the people doing the work — case managers,
fundraisers, program staff — don't know where to start or how to use AI *safely* for
sensitive, mission-critical tasks.

Generic chatbots don't solve this: they start from zero every session, know nothing
about the organization, and won't proactively protect vulnerable-client data or flag an
unsupported claim.

### What it does

The Studio does the actual work — it drafts the donor letter, structures the case note,
shortlists the resources — grounded in the organization's own knowledge and checked
against responsible-AI standards before a human ever sees it.

It is built from three shared layers plus pluggable workflow modules:

1. **Org Brain** *(the moat)* — the organization's curated knowledge: mission, programs,
   voice, constraints. Built once; every workflow reads from it; it gets richer with use.
2. **Responsible-AI layer** — a curated [standards library](#responsible-ai-standards-library)
   that powers per-workflow guardrails and labels every output by its basis.
3. **Workflow modules** *(per domain)* — fundraising, case management, resource
   navigation, reporting. Each reads the Org Brain and runs through the agent loop.

A **discovery front door** guides an unsure user (e.g. "I'm a case manager and I don't
know what to automate") toward their first workflow.

### How a workflow runs (the agentic loop)

Each module runs a genuine multi-step agent loop — the core of the Advanced Agentic
Workflows specialization:

```
Plan → Retrieve (Org Brain) → Draft → Self-critique (Challenger) → Revise → Finalize
```

The **Challenger** step is adversarial self-review: the agent critiques its own draft
against the responsible-AI standards and fixes what it finds — removing an inferred
detail that wasn't in the source, lowering the reading level, flagging an uncertain fact
for human verification — *before* the user sees the result.

Every statement in the finished document carries a **provenance label**:
`user-supplied` · `source-backed` · `AI-suggested` · `requires-verification`. Nothing
is presented as more certain than it is.

### Why it is personalized, not a template mill

Output is **generated** from each organization's Org Brain, not selected from a library.
Two nonprofits with different missions, programs, and voices cannot produce the same
document: the agent retrieves and weaves *their* facts, and different contexts trigger
different responsible-AI checks. Swap the Org Brain and every org-specific value changes.

### What it is not

The Studio supports human decisions. It does **not**:

- Certify that a workflow is safe, compliant, or approved.
- Make client eligibility, referral, or other decisions about people.
- Replace legal, privacy, technical, or service-domain review.
- Send, publish, or take external action on its own — a human always reviews and acts.
- Handle real personal data in this prototype (synthetic examples only).

---

## Responsible AI Standards Library

The Studio applies responsible-AI standards **written and reviewed by people** — the AI
does not invent ethical criteria. The library is an in-progress set of human-authored
standards organized across key categories — accuracy & grounding, privacy, fairness,
accessibility, human oversight, safety, transparency, security, evaluation, and
accountability. Each standard is grounded in an authoritative source (NIST AI RMF,
NIST AI 600-1, WCAG 2.2, National CLAS Standards, SAMHSA, OWASP LLM, and others) and
marked with its derivation and review status.

**In the MVP, a thin, module-specific slice is used** — for the first module, a handful
of standards (data minimization, evidence grounding, AI-involvement disclosure, plain
language, human review). The full library, its versioned release model, and its
governance are the product's long-term moat and roadmap, not MVP scope.

---

## MVP scope

The first shippable version proves the whole thesis with one deep module:

- Capture an organization's **Org Brain**.
- Run **one workflow module** (fundraising / donor communications) end-to-end through the
  real agent loop.
- Apply the **responsible-AI slice** and **provenance labels** to the output.
- Persist each run (inputs, self-critique log, final draft, review status) to the database.
- A **human review / approve** step before anything is considered done.

Deferred (Should / Could / Won't): additional modules, live org-switcher, semantic
retrieval, the full standards library, multi-tenant governance, and any real-PII or
live-integration features.

**Riskiest assumption being tested:** a non-technical, AI-anxious nonprofit worker will
trust and *actually use* an AI-generated, ethically-guarded document for a real task.

---

## Planned technology

These are initial choices and may change.

| Area | Planned approach |
|------|------------------|
| Frontend | Next.js + TypeScript (Progressive Web App) |
| Database & auth | Supabase (Postgres, auth, row-level security); SQLite for local start |
| Hosting | Vercel |
| AI model access | Claude (Anthropic) via server-side API routes only |
| Development | GitHub for version control; Claude Code for AI-assisted development |
| Design approach | Deterministic rules for standard selection, labeling, and report structure; AI agents for drafting, retrieval, and self-critique |

---

## Roadmap (aligned to the residency schedule)

The weekly coding challenges build the product piece by piece — learning each skill as
its component is needed.

| Weeks | Residency focus | Product milestone |
|-------|-----------------|-------------------|
| 1 (Oct) | GitHub + Claude Code; specialization | Research paper; repo; product chosen |
| 2 | Product specifications | Product spec / PRD |
| 3 | Host a web app | Deployed skeleton: Org Brain intake + database |
| 4 | Build an AI chatbot | The agent loop for module 1 |
| 5 | Security / PenTest | Harden privacy & security of the ethics layer |
| 6 | PWA + microservices | Restructure as PWA; add a second module |
| 7 | Integrate apps | Export / integration + saved-workflow library |
| 8 | SEO / AEO | Landing page and go-to-market |
| Post-curriculum (Dec–Feb) | Self-directed | Validate with real nonprofits, measure hours saved, pilot & polish |

---

## Repository structure

```
.
├── .claude/skills/   Enterprise-development Skills Claude applies to every task
├── Week 1/           Weekly coding-challenge submissions (see Week 1/README.md)
├── CLAUDE.md         Project working agreement (which Skills to apply, when)
├── README.md         You are here
└── (application code added as development begins)
```

The six project Skills (secure-coding, ux-usability, accessibility,
testing-code-review, documentation, mvp-scoping) are documented in
[`Week 1/README.md`](Week%201/README.md) and enforced via [`CLAUDE.md`](CLAUDE.md).

---

## Status & disclaimer

Early-stage prototype built for learning during the AI Development Residency. Outputs are
drafting and design aids, not certifications, legal advice, or approvals. Organizations
remain responsible for their own legal, privacy, technical, and service-domain review.
The prototype uses synthetic data only; secrets and API keys must never be committed to
this repository.
