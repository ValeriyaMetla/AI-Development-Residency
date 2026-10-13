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

**Helping nonprofits build and run responsible AI — the policies, the working processes,
and the living system that keep AI use safe as it grows.**

### The problem

Nonprofits have adopted AI widely but shallowly. Surveys put adoption high while only
about 7% report meaningful impact, most use is reactive and un-governed, and only a small
share have any AI policy at all. Funders increasingly expect responsible AI — yet the
organizations least able to afford consultants are exactly the ones without policies,
processes, or oversight. Governance is the clearest, most universal gap in the sector,
and static policy templates serve it poorly: they hand you a PDF, not a process.

### What it does (governance first)

Community AI Workflow Studio closes that gap as a **living system, not a one-time
document.** Through a guided agentic intake, it helps an organization produce and
maintain:

1. **Documentation** — a tailored AI use policy and data-handling rules, grounded in
   human-authored standards.
2. **Working processes** — per-task guardrail checklists, human-review checkpoints, and
   escalation paths that staff actually use.
3. **A living governance system** — new AI uses are assessed, policies are versioned, and
   guidance updates as the organization's AI use grows.

### How it works (the architecture)

Three shared layers plus pluggable workflow modules:

| Layer | What it is |
|-------|------------|
| **Org Brain** | The organization's curated knowledge (mission, programs, constraints), retrieved into every task so output is specific to that nonprofit. |
| **Responsible-AI standards library** | Human-authored standards grounded in sources such as the NIST AI Risk Management Framework, WCAG, and the OWASP Top 10 for LLMs. The AI applies standards; it does not invent ethical criteria. |
| **Workflow modules** | Governance modules first; do-the-work modules on the roadmap. Each reads the Org Brain and the standards. |

Each module runs a genuine agentic loop:

```
Plan → Retrieve (standards + Org Brain) → Draft → Challenger self-critique → Revise → Finalize
```

The **Challenger** reviews each draft against the standards and flags gaps or unverified
claims before a person sees it. Every statement carries a **provenance label**
(user-supplied, source-backed, AI-suggested, or requires-verification), and a person
reviews and approves before anything is adopted.

### What it is not

The Studio supports human decisions. It does **not** certify compliance, make decisions
about people, score or prioritize anyone, replace legal or privacy review, or send or act
on its own. It drafts and safeguards; a human always reviews and acts.

---

## Why governance is the lead wedge

- **Most validated need.** The governance gap is the single most consistent finding across
  nonprofit-AI research, and it spans every sub-sector (human services, housing, reentry,
  refugee services).
- **Hard to DIY, funder-aligned.** Nonprofits can't easily write a real policy or process,
  and funders increasingly require responsible AI — which opens a funder-as-buyer path.
- **Not a wrapper.** The moat is the curated, sourced standards library, a structured
  process, persistence (governance that evolves), and provenance — none of which a general
  chatbot provides.
- **Avoids the landmines.** No client PII, no case-management-system integration, and no
  prioritization or risk-scoring — the exact things the sector distrusts.

On the roadmap, the same engine extends to **do-the-work modules** (drafting a donor
message, a case note, a funder report), so an organization first establishes its
governance and then applies it to real tasks.

---

## MVP scope (residency)

**Riskiest assumption:** a nonprofit (or a funder on its behalf) will trust and *actually
adopt* an AI-generated governance system — and *use* the governed work products that apply
it — as its real policy, process, and output.

**Cheapest test first:** a concierge run — manually produce a governance pack *and* two or
three governed work drafts for 2–3 real nonprofits (with AI behind the scenes) and see
whether they adopt and use them, before heavy build.

**The MVP** — an agent that takes an organization from intake to (1) a usable governance
starter and (2) a few governed work products that visibly apply it:

- **Must — engine + governance:** org intake (a lean Org Brain) → retrieve relevant
  standards → tailored **AI use policy** + **1–2 working-process artifacts** (a guardrail
  checklist and a human-review process) → provenance labels → a **Challenger** pass that
  flags gaps → human review → save/export.
- **Must — 2–3 do-the-work modules** that bake the org's governance (guardrails +
  provenance) into each output: **donor thank-you / appeal**, **impact / board report**,
  and a **general communications / newsletter draft**. Low-risk; no client data.
- **Should:** living-system lite (track AI uses; re-run on a new one); a one-page staff
  guideline; a fourth module (e.g., grant-narrative first draft).
- **Could:** funder/cohort view; full standards-library browse; versioned releases.
- **Won't (MVP):** modules touching client PII or decisions about people (case notes,
  resource/eligibility matching); registry/DAO governance; verifying the full standards
  library; multi-tenant funder deployment; sending or acting on anything.

**Build order:** engine → governance → one module (prove it) → the remaining modules.

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
| Design approach | Deterministic rules for standard selection, labeling, and report structure; AI agents for intake, drafting, and self-critique |

---

## Roadmap (aligned to the residency schedule)

The weekly coding challenges build the product piece by piece.

| Weeks | Residency focus | Product milestone |
|-------|-----------------|-------------------|
| 1 (Oct) | GitHub + Claude Code; specialization | Research paper; repo; product chosen |
| 2 | Product specifications | Product spec / PRD |
| 3 | Host a web app | Deployed skeleton: org intake + database |
| 4 | Build an AI chatbot | The core agent: intake → retrieve standards → draft policy |
| 5 | Security / PenTest | Harden privacy & security of the governance tool |
| 6 | PWA + microservices | Add the working-processes module + Challenger agent |
| 7 | Integrate apps | Export (Word / Google Docs / Notion) + standards-library wiring |
| 8 | SEO / AEO | Landing page and positioning |
| Post-curriculum (Dec–Feb) | Self-directed | Concierge test, validate with nonprofits & funders, refine standards, polish |

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
