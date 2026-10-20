# Advanced Agentic Workflows — and Building Them Responsibly

*Specialization Research Paper · AI Development Residency, Week 1*

Val · October 20, 2026

## Introduction to Advanced Agentic Workflows

Most AI tools can answer questions, but for AI to work toward a goal on its own requires setting up an agentic workflow where you can give it a task, and it makes a plan, uses tools to get things done, looks at what comes back, and adjusts until the job is finished (Anthropic, 2024a). We have already seen the massive shift from an AI that replies to one that gets work done.

Anthropic (2024a) provides a helpful distinction here and splits these systems into two kinds. In a workflow, the developer's code decides the steps the AI follows. In an agent, the AI decides its own steps and which tools to use. The real difference is how much freedom the AI has. Workflows are predictable; agents are flexible but cost more time and money, so part of the skill is knowing which one a task actually needs (Anthropic, 2024a).

What makes any of this "agentic" is the loop: the AI reasons, acts, checks the result, and tries again. That simple cycle is what lets a system break a big job into steps, catch its own mistakes, and handle problems it can't fully plan out in advance. It is the engine behind today's coding assistants and research tools — and behind the product I describe later in this paper.

This paper carries a second subject that is, for me, the heart of the work: **responsible AI**. I am choosing advanced agentic workflows as my specialization, but my real focus is building them *ethically* — because an agentic system acts on its own, using tools, making choices, and affecting real people, so building one responsibly is inseparable from building one at all. Guardrails, human oversight, transparency, fairness, and responsible-AI standards are not a final checklist; they are part of the design from the first line. That conviction runs through every section that follows, and it is the reason the product I propose is itself a governance tool: it uses agentic workflows to help under-resourced organizations — the ones serving the people most exposed to AI's harms — adopt AI responsibly and equitably.

## Why This Specialization Matters to My Career

My aspiration is to build a career in UX and product management, where I design and ship real products with AI — and, specifically, to be the kind of product person who makes sure those products are trustworthy. Agentic workflows are at the heart of that work, and responsible-AI judgment is the edge I want to be known for.

The demand is clear in the United States. Lightcast, the labor-market data partner for Stanford's AI Index, found that postings asking for agentic-AI skills grew more than 280% in a single year — from 0.06% to 0.23% of all U.S. job postings, nearly 90,000 openings — the fastest rise of any AI skill it tracks. More broadly, 2.5% of U.S. job postings now ask for AI skills, up 55% in a year (Lightcast, 2026). Employers increasingly want people who can design multi-step, tool-using systems rather than write one-off prompts, so learning to build and govern them puts me where the work is heading. And it is not only engineers who need this — product and UX people who understand how these systems behave, and where they can go wrong, are the ones who can shape them well. That is exactly the role I'm aiming for.

It also fits the kind of work I want to do: software that helps people, built in a way that protects them. My residency product uses agentic workflows to help organizations — starting with under-resourced nonprofits — adopt AI responsibly. So the paper and the product feed each other: studying how these systems work, and how they fail, makes me better at building one that is safe.

## Background: From Chat Completions to Autonomous Agents

Agentic workflows didn't appear overnight. They grew out of a few key research steps that taught language models to reason and act. Early models just gave one answer to one prompt. Then chain-of-thought prompting showed that asking a model to write out its reasoning, step by step, made it much better at hard problems (Wei et al., 2022). Reasoning became something you could see.

The real turn toward agents was ReAct. It let a model switch between thinking and doing — reason, take an action, see what happened, reason again (Yao et al., 2023). That loop is the core of every agentic workflow. Soon after, Reflexion added self-review: the model looks back on a failed attempt, writes down what went wrong, and uses that note to do better next time (Shinn et al., 2023). Together these gave agents their three basic abilities — reasoning, using tools, and correcting themselves.

After about 2023, these ideas moved from research into real products. AI models gained the built-in ability to use tools, and new software made it easier to connect the steps. Anthropic (2024a) helped organize the field by giving these common setups names and clearly separating workflows from agents. Shared tools — like the Model Context Protocol, a standard way to connect an AI agent to outside data and systems (Anthropic, 2024b) — made it practical to build agentic workflows into everyday software. As the systems gained autonomy, the need to govern them grew in step: the same freedom that makes an agent useful is what makes oversight essential.

## How Agentic Workflows Work When Building Products

Inside a product, an agentic workflow is a loop built around a language model. You give the model a goal and a set of tools; it plans, uses a tool, reads the result, and decides what to do next, repeating until the task is done (Anthropic, 2024a). Three things make this work: tools (functions it can call to find information or take action), memory (what it needs to keep track of as it goes), and a control structure that sets how much freedom it has.

Anthropic (2024a) describes a handful of building blocks that most real systems mix and match:

1. **Prompt chaining** — split a task into a fixed series of steps, each building on the last.
2. **Routing** — sort an incoming request and send it down the right path.
3. **Parallelization** — run several parts at once, or try a few times and combine the best.
4. **Orchestrator–workers** — a lead model breaks up a task and hands pieces to helper models.
5. **Evaluator–optimizer** — one model drafts, another critiques it, and the draft improves in a loop.

The big design choice is how much freedom to give the model. Fixed workflows are predictable, cheaper, and easier to test, so they fit well-defined tasks. Full agents handle open-ended problems you can't script, but every extra step adds time, cost, and the chance that an early mistake snowballs (Anthropic, 2024a). The rule of thumb is to start simple, add autonomy only when the task really needs it, and add guardrails and human check-ins as you do. For sensitive work, that rule points firmly toward governed workflows over free-roaming agents.

## What the Specialization Includes

Building agentic workflows pulls together several pieces. Someone good at it understands each one and how they connect:

- **The model and prompting.** The reasoning engine, guided by well-written prompts that set its role, limits, and output.
- **Tools and integration.** The functions an agent can call — search, databases, APIs, code — plus the permissions that keep them in check. Standards like the Model Context Protocol connect agents to outside systems in a consistent way (Anthropic, 2024b).
- **Memory and context.** Keeping track of the task and pulling in the right information so answers are grounded in real data (retrieval-augmented generation).
- **Planning and orchestration.** The logic that decides the order of steps and how the pieces fit together (Anthropic, 2024a).
- **Self-critique.** The agent reviewing and improving its own work before handing it over — the reflection idea, now in real products (Shinn et al., 2023).
- **Guardrails and governance.** Checks that keep an agent safe: validating inputs and outputs, limiting tool access, and setting rules for privacy, fairness, and accuracy. The NIST AI Risk Management Framework gives a solid structure for this (NIST, 2023), and risk-tiering models like the EU AI Act's (European Union, 2024) help decide how much oversight a given use needs.
- **Evaluation.** Test cases, metrics, and logs that show what the agent did and how well — essential, since these systems don't behave the same way every time.
- **Human oversight.** Clear points where a person reviews and approves, so people stay in charge of anything that matters.

So this is as much an engineering and judgment skill as a modeling one. The model brings the intelligence; the tools, memory, guardrails, and testing make it dependable — and the governance makes it safe to put in front of real people.

## What Teams Actually Do to Build Agentic Systems

Building these systems takes a team across product, engineering, and governance. The main jobs:

- **Scoping and design.** Product and design people decide which tasks are worth automating, map how the work is done today, and set where the AI acts and where a person stays in control. Getting that line right is what separates a useful agent from a risky one.
- **Prompt and flow design.** AI engineers write the prompts, pick the pattern, and set how much freedom the agent has (Anthropic, 2024a).
- **Tools and data.** Engineers connect the agent to the systems it needs and decide what it's allowed to touch.
- **Evaluation.** Because agents aren't fully predictable, teams write test cases and check results continually, not just once.
- **Red-teaming and security.** People try to break the agent — for instance with prompt injection — and add defenses, guided by resources like the OWASP Top 10 for LLMs (OWASP, 2025).
- **Responsible-AI review.** Ethics, privacy, and domain reviewers check for fairness, privacy, and accuracy, and make sure human oversight is real (NIST, 2023).
- **Participatory and community co-design.** Experts and the people affected — ideally as co-designers, not just reviewers — weigh in on whether the agent behaves well in context and help shape the rules it follows.
- **Monitoring.** After launch, teams watch how it performs, look into problems, and keep adjusting.

A good agentic product depends on product, engineering, and responsible-AI people working closely together.

## Tools and Skills to Learn

Getting good at this means learning both a toolkit and the thinking behind it.

**Tools**

- **Model APIs.** Working directly with a model API like Anthropic's Claude — prompts, tool calling, streaming — is the foundation. You can build a lot with just an API and no framework at all (Anthropic, 2024a).
- **Orchestration frameworks.** LangGraph gives fine-grained, stateful control; CrewAI treats agents as a team of roles and is fast to prototype; AutoGen is built around agents talking to each other. Start simple, and reach for a framework only when you need it (Anthropic, 2024a).
- **Model Context Protocol (MCP).** An open standard for plugging agents into outside tools and data (Anthropic, 2024b).
- **Retrieval and vector stores.** Retrieval-augmented generation and vector databases (like pgvector in Postgres) keep an agent grounded in real, current information.
- **Evaluation tools.** Ways to write test cases, score outputs, and trace what the agent did.

**Skills**

- **Prompt and context engineering** — getting reliable behavior out of a model.
- **Software engineering** — a working language (Python or TypeScript), APIs, and databases; an agentic product is still a software product.
- **Evaluation thinking** — defining what "good" means and measuring it, including red-teaming for failures like prompt injection (OWASP, 2025).
- **Responsible-AI and governance** — the deepest learning curve for this project, and the skill I most want to build (expanded below).
- **Product and domain judgment** — knowing what to automate, where a person must stay in control, and what the people affected actually need.
- **Inclusive design literacy** — participatory and co-design methods, trauma-informed design principles (SAMHSA, 2014), and design justice (Costanza-Chock, 2020), so the people most affected help shape the product and it does no harm.

**Responsible-AI and governance — the core skill.** This is the heart of the specialization for me. It means reading the major frameworks — the NIST AI Risk Management Framework (NIST, 2023), the EU AI Act's four risk tiers (European Union, 2024), and the ISO/IEC 42001 AI management-system standard (ISO/IEC, 2023) — and then *translating* them into something operational: a concrete risk model (the factors that make an AI use risky — how sensitive the data is, who is affected, how consequential the decision is, how much autonomy the AI has) and a guardrail library (the required controls — consent, data minimization, human review, scope limits) mapped to each level of risk. A key design judgment sits here: the consequential decision — *how risky is this use?* — should run on transparent, inspectable rules, not an opaque model, so that the governance tool is itself governable.

Crucially, these skills are learned best by *building*, not just reading. Designing a risk model and guardrail library is an iterative loop — study a framework, pull out the factors and controls it implies, draft them, make the judgment calls, encode them, and test against real examples — and it can be done hands-on with an AI assistant acting as tutor, researcher, and implementer while the human keeps ownership of the judgment. For this residency, the act of building the product *is* the act of learning the specialization.

The tools change fast. The habits of mind — thinking about autonomy, grounding, testing, governance, and safety — carry over no matter which framework is in fashion.

## The Application I Will Build: The Governed AI Ladder

### The problem

Organizations are adopting AI far faster than they can govern it. The sharpest version of this gap is in the nonprofit sector, which is where my product starts and where its inspiration comes from: nonprofits have adopted AI quickly but without much structure — many use it, but industry surveys suggest only about 7% see real impact, most use is casual and one-off, and very few have any AI policy at all (NonprofitPRO, 2025; TechSoup, 2025). Funders increasingly expect responsible AI, yet the organizations least able to hire consultants are the ones with no rules or oversight.

But the gap is not unique to nonprofits. Any organization putting AI near sensitive data or real decisions faces the same unanswered question — *should we use AI for this, and how do we do it safely?* — and most have no good way to answer it. Nonprofits are my starting point because the need is most acute and I understand the context; the tool itself is built to serve any organization.

### What it is

The **Governed AI Ladder** (working title: Community AI Workflow Studio) is a governance-first platform for under-resourced organizations. Governance is not a feature bolted on at the end; it is the foundation every capability inherits. The product is a four-rung ladder — **Policy → Skills → Workflows → Agents** — where each rung adds autonomy but stays bound by the rules set at the bottom.

One distinction shapes the whole design. Under the hood, every rung runs the same agentic loop — plan, pull in context, draft, self-critique, revise (Anthropic, 2024a; Shinn et al., 2023); that engine is constant and invisible. The rungs are not about the engine — they are a ladder of *who decides the steps*, from the human to the AI:

1. **Policy** — the organization's rules (data handling, who is affected, what needs human review), set through a short guided intake. This is not AI doing work; it is the guardrail layer everything above inherits.
2. **Skills** — a single reusable, governed task the user triggers, such as drafting a board report. The flagship Skill is the **AI Governance Co-Pilot**, which answers the question above — *should we use AI for this, and how?* It parses a proposed use into risk factors, scores it against the EU AI Act's risk tiers (European Union, 2024) on transparent, inspectable rules rather than an opaque model, generates the required guardrails from a standards library grounded in the NIST AI Risk Management Framework (NIST, 2023) and ISO/IEC 42001 (ISO/IEC, 2023), and records the decision to an AI-use registry.
3. **Workflows** — several Skills chained in a fixed, user-defined order that runs the same way every time — a *workflow* in the sense this paper opened with (Anthropic, 2024a).
4. **Agents** — the AI chooses which Skills to run toward a goal, a dynamic path bounded by the policy — an *agent* in that same sense. This rung comes last, on purpose.

So the product is the workflow-versus-agent distinction turned into a growth path: Skills and Workflows keep the human in control of the steps; Agents hand that control to the AI only once the guardrails and the user's trust are in place.

The real differentiator lives in that standards library, which has two tiers. The first is a **compliance baseline** — the NIST AI Risk Management Framework (NIST, 2023), the EU AI Act (European Union, 2024), and ISO/IEC 42001 (ISO/IEC, 2023) — that any serious governance tool can cite. The second is a co-designed **Justice Layer**: guardrails that operationalize equity, justice, and trauma-informed principles into concrete checks the agent pulls when a task touches vulnerable people or a consequential decision. Compliance frameworks tell an organization what to avoid; the Justice Layer helps it actively do right by the people it serves — and that layer, not the baseline everyone shares, is what sets the product apart.

### How a user climbs it

The ladder is climbed through a task-first loop, so no one has to write policy before getting value. A new organization **seeds** a baseline policy in a few minutes of guided intake, then **does real work** through Skills — each run governed by that baseline and logged to the AI-use registry. The registry of real decisions **becomes** the organization's living AI policy and its audit trail: governance learned by doing, not read upfront. As patterns repeat, Skills are **composed** into Workflows; as trust grows, the organization **delegates** multi-step goals to Agents. The ladder is the roadmap; the loop is how they climb it.

### Why ethics is the heart, not a feature

The platform is designed around limits as much as abilities. It *assists*; it never makes decisions about people, never scores or ranks individuals, and never predicts outcomes like risk or eligibility — a deliberate boundary that keeps it clear of the well-documented harms of predictive scoring in high-stakes settings. Every output is labeled by where it came from (something the user said, something backed by a standard, an AI suggestion, or something that still needs checking), and a person always has the final say. Because governance is set once at the Policy rung and inherited by every Skill, Workflow, and Agent above it, responsible AI is not a review stage at the end — it is the foundation the whole product stands on.

### How I will design it: participatory, trauma-informed, and justice-driven

How a governance tool is built should embody what it stands for, so the design method mirrors the mission. Three commitments shape it.

**Participatory-informed.** The people affected help design the rules, at two levels. Each organization co-designs *its own* policy — the Step-1 intake and the registry that accumulates from real use are the organization authoring its governance, not receiving it. The shared Justice Layer is co-designed with affected communities and practitioners; my first co-design partner is Tech Fleet itself, whose teams use AI and can shape which equity principles belong. I call this participatory-*informed* on purpose: in the residency timeframe it means a handful of co-design interviews and an advisory loop, not a full research program.

**Trauma-informed.** Many frontline users work under stress and serve people who have experienced harm, so the platform follows trauma-informed principles (SAMHSA, 2014): it coaches rather than scolds when it flags a risky use, stays transparent about what the AI did and why, keeps a person in control of every decision, minimizes sensitive data, and checks outputs for stigmatizing or deficit-based language. Each principle becomes a concrete check or interface rule, not a slogan.

**Equity and justice-driven.** Following design-justice principles (Costanza-Chock, 2020) — center the most affected, treat people as experts in their own lives, and shift power rather than only widen access — the organization owns and can export its governance registry (no lock-in), baseline safety is never paywalled, and the platform refuses to score, rank, or predict about people. That refusal is a deliberate stance against the documented harms of predictive risk scoring in high-stakes settings. The goal is not only safe AI, but *just* AI.

### How it maps to the specialization

The Ladder is a direct expression of the specialization. Each rung runs a real agentic loop — it plans, pulls in the right standards and context, drafts, critiques its own draft against the standards before a person sees it, and produces a governed result — the evaluator–optimizer and reflection patterns at work (Anthropic, 2024a; Shinn et al., 2023), inside clear human-oversight checkpoints. And the rungs themselves trace the field's core distinction from fixed workflows to autonomous agents, following its advice to start simple and add autonomy only when a task truly needs it (Anthropic, 2024a) — which is exactly why Agents are the last rung, not the first.

### How I will build and test it — and what I hope to learn

I will ship the Ladder rung by rung. The MVP is rungs one and two — a seeded policy, a handful of governed Skills (the Governance Co-Pilot among them), and the registry that turns everyday use into the organization's policy; Workflows and Agents follow once that foundation holds. The riskiest assumption I need to test first is simple: will a small organization complete the short policy seed and then trust and reuse a governed Skill built on it? The whole ladder rests on that first rung.

The platform is also a small research instrument. Different kinds of organizations face different risks, so I will test it across several use cases and organization types — beginning with nonprofits, where the need is clearest and my context is strongest — to learn what governance each actually needs. Comparing how the risk factors and required guardrails shift from one organization type to the next is itself part of the contribution: an early look at whether the standards library and risk model generalize, or whether responsible AI adoption is more context-specific than the frameworks assume.

In short, the Governed AI Ladder puts the whole specialization to work — tools, memory, orchestration, self-correction, guardrails, testing, and human oversight — all in service of one goal: making responsible AI adoption practical, step by step, for the organizations that need it most and can least afford to get it wrong.

## References

Anthropic. (2024a). *Building effective agents.* https://www.anthropic.com/research/building-effective-agents

Anthropic. (2024b). *Introducing the Model Context Protocol.* https://www.anthropic.com/news/model-context-protocol

Costanza-Chock, S. (2020). *Design justice: Community-led practices to build the worlds we need.* The MIT Press. https://design-justice.pubpub.org/

European Union. (2024). *Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act).* Official Journal of the European Union. https://eur-lex.europa.eu/eli/reg/2024/1689/oj

International Organization for Standardization & International Electrotechnical Commission. (2023). *ISO/IEC 42001:2023 — Information technology — Artificial intelligence — Management system.* https://www.iso.org/standard/81230.html

Lightcast. (2026). *The Stanford AI Index Report 2026.* https://lightcast.io/resources/research/stanford-ai-index-2026

National Institute of Standards and Technology. (2023). *Artificial intelligence risk management framework (AI RMF 1.0)* (NIST AI 100-1). U.S. Department of Commerce. https://doi.org/10.6028/NIST.AI.100-1

NonprofitPRO. (2025). *Nonprofit AI adoption hits 92%, but only 7% see major impact.* https://www.nonprofitpro.com/article/nonprofit-ai-adoption-hits-92-but-only-7-see-major-impact/

Open Worldwide Application Security Project. (2025). *OWASP top 10 for large language model applications.* https://owasp.org/www-project-top-10-for-large-language-model-applications/

Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). *Reflexion: Language agents with verbal reinforcement learning.* arXiv. https://arxiv.org/abs/2303.11366

Substance Abuse and Mental Health Services Administration. (2014). *SAMHSA's concept of trauma and guidance for a trauma-informed approach* (HHS Publication No. SMA 14-4884). U.S. Department of Health and Human Services. https://store.samhsa.gov/product/SMA14-4884

TechSoup. (2025). *The state of AI in nonprofits 2025.* https://page.techsoup.org/ai-benchmark-report-2025

Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). *Chain-of-thought prompting elicits reasoning in large language models.* arXiv. https://arxiv.org/abs/2201.11903

Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing reasoning and acting in language models.* arXiv. https://arxiv.org/abs/2210.03629
