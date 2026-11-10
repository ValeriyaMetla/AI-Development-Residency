# Week 4 Lecture Reference — Technical / Enterprise Application Architecture

> **What this is.** A faithful capture of the Week 4 residency lecture on **technical /
> enterprise application architecture**, kept for our own reference while we build Phase 0.
> Diátaxis type: **Reference** (the lecture's facts and method), with a clearly separated
> **"Our notes"** section near the end for how it maps to this repo. It is *not* a how-to or a
> rule set — anything we decide to *adopt* graduates to `BUILD-RULEBOOK.md` or an ADR (decision
> D2).
>
> **Source.** Captured 2026-11-09 from screenshots of the lecture slides, provided by Val.
> Internal reference only. **§16 also captures the Week 4 assignment/rubric** (marked as such — it
> is the homework, not lecture content).
>
> **A note on numbering.** The course *deliverables map* labels these topics as **"Week 3."**
> Val and the repo's [`BUILD-DECISIONS.md`](../BUILD-DECISIONS.md) identify the lecture itself as
> **Week 4** (Enterprise Application Architecture). The numbering differs between the deliverables
> map and the lecture schedule; the content is the same. Titled "Week 4" to match the repo.

---

## 1. The big idea — architecture is problem-solving

- You don't need to be deeply technical to architect well. In the lecture's words: *"UX people
  and social scientists can be as effective, if not more effective, at architecting
  applications when we tackle the problems and don't worry about the solutions first."*
- **Technical architecture *is* problem-solving.** The technology — and the code — is the
  *solution to the problems*. Solve the right problems correctly, and the right technology
  follows.
- Apply the **Language of Change: Criteria, Commit, Collaborate, Change** — establish shared
  words and understanding *before* building any solution.
- *"Develop the Language of Change first, and then your team (humans, Claude) will build the
  right solution to the right problems."*

**The Language of Change — four questions:**
1. What's happening right now that needs to change?
2. What are the outcomes we need to achieve?
3. How do we know we will have succeeded?
4. What are we going to commit to first?

---

## 2. What a Technical Architect does (the head-chef analogy)

**The head chef *is*:** the Technical Architect.

**The head chef *does*:** The Technical Architect is the head chef — they don't cook the dishes
and aren't themselves developing. Their job is to decide **how the whole kitchen works** so that
every dish comes out right, every time, for everyone. They plan and design how an app is built
*before* building starts, and keep it on track while it's being built — making the big choices
about the shape of the thing. The "line chefs" (the developers, the UX designer, and the AI) do
the cooking. **The Tech Architect tastes every plate before it goes out.**

> *"You do not need to code to do this job. You need to understand the ingredients well enough
> to make good calls and to check the work. A great head chef can taste a sauce and know what is
> wrong with it, even if a line chef stirred the pot."*

**What purpose does it serve? The Technical Architect designs the architecture of the entire
structure. They decide:**
- a. What **servers and dev tools** to use.
- b. What **programming languages** make the most sense, based on the desired speed,
  performance, and security of the system.
- c. How to design the code for **speed**.
- d. How to design the code for **security**.
- e. How to get **multiple developers** working on the same code at the same time without
  blowing up the end product.
- f. The **standard operations** for QA testing, coding, and security.

---

## 3. What "Enterprise ready" means — the four promises

You can make a sloppy plate for yourself and nobody cares. But the moment a dish goes out to 300
people at once, every weakness shows. **"Enterprise ready" is that jump** — the app is built to
serve a whole room of real people, for a long time, not just to work once on your own screen. As
the head chef, your job is not to prove the app *can* run; it's to make sure it **keeps running
right when it's busy, when something breaks, and when the recipe needs to change next month.**

**The app keeps four promises:**
1. **Reliability** — it doesn't fall apart when one small thing goes wrong (a single bad
   ingredient never ruins the whole plate).
2. **Scalability** — it serves everyone well even at the busiest moment and the last table
   (*measure your slowest rush, not your easy average*).
3. **Maintainability** — it stays easy and safe to change later (a new cook can walk in,
   understand how it works, and fix or add something without blowing up the rest).
4. **Security** — it keeps people's data private and only in the right hands.

> None of this is extra polish added at the end. **It is the plan you make from the first day,
> and the standard you taste against before anything leaves the kitchen.**

### How you know it's enterprise ready (the architect's questions)
- **Where does it live?** An app lives in three places at once: the customer's screen, a server
  that does the work, and a database that stores anything that must still be there tomorrow. The
  architect decides which work happens where, and where those servers run — almost always
  *rented from a hosting company (the cloud), not owned.*
- **What is the app built on?** Raw parts (programming languages, design pieces) plus ready-made
  ones (libraries and APIs — prebuilt code and other companies' services you plug in instead of
  building from scratch). The architect picks the languages, the database type, and the
  ready-made parts.
- **How do the pieces fit together?** The architect decides how the screen, the server, and the
  database talk. A request travels screen → server → database → back. **Each part has one clear
  job and connects through known openings, instead of reaching into another part.**
- **Why did we build it this way?** Every real choice costs something and rules something else
  out. The architect writes down why each important choice was made, kept on record so nobody
  re-argues or quietly undoes it. **Rule: never erase an old note — if the choice changes, write
  a new one.**
- **How might we build it reliably, securely, and scalably?** Choices that keep three of the
  four promises, **planned from the start, not patched on at the end.**
- **How do we efficiently maintain this at 1,000,000 users?** *Software side:* every fact has
  one home, each part has one job, there's one way to do each thing, and dead code gets deleted.
  *Team side:* the shared code home (GitHub) is set up to enforce standards and let every
  developer work together cleanly. **If one developer can build smoothly but another cannot, the
  team has a problem.**

---

## 4. Layers of Software Architecture

**What a layer is.** A group of code with one job. Each layer uses the layer **below** it, and
the layer below doesn't even know the layer above exists. Fowler calls layering one of the most
common ways to break a complicated system into parts.

**How layers shape enterprise architecture.** Fowler builds his whole book around three layers:
- **Presentation** — the service you offer the outside world.
- **Domain** — the real point of the system: the business rules.
- **Data source** — how you use other systems, mostly the database.

Layering lets you understand one layer without the others, swap one out without rewriting the
rest, and keep the parts from leaning on each other too much. *The catch:* some changes still
ripple through every layer (e.g. a new field that has to show on screen **and** be saved).

**Where the Service Layer fits.** Fowler often splits the domain layer in two. On top sits a
**thin Service Layer** that lists every action the app offers (add a transaction, set a monthly
budget). Underneath sit the business rules themselves. The screen talks **only** to the Service
Layer, which then calls the business rules. This gives the app one clear **front door**, one
place to check a person is **allowed** to do an action, and one place to make sure each action
either **fully finishes or doesn't happen at all**. It's most useful on top of a Table Module or
Domain Model; an app built only from Transaction Scripts usually doesn't need one, because each
script already acts as the front door for its own action. *Fowler's advice: keep it as thin as
possible, add it only when the app needs it.*

**The golden rule.** **The domain and data source layers must never depend on the presentation
layer.** Because the rules and the data don't rely on the screen, you can change how the app
looks many times — or add a phone app next to the website — without breaking the business rules.

**A quick test for rules in the wrong place.** Imagine adding a totally different screen (a phone
app next to the website). **Anything you'd have to copy over is a business rule hiding in the
wrong layer** — move it down into the domain layer so every screen shares one copy.

**Layers are not machines.** A *layer* is about how code is **organized**, not where it runs. A
*tier* usually means a separate machine. All three layers can run on one laptop. *Fowler's
advice: keep everything in one place unless you truly have to split it — every split across a
network adds cost and complexity.*

**Why layering caught on.** In the 1990s many apps buried their business rules inside desktop
screens; when the web arrived, those teams had to rewrite everything. Teams that kept a separate
domain layer just added a new web screen on top. *That one story is the whole payoff of layers.*

### The cake — the four layers (+ the plate)
Top to bottom, each layer sits on the one below; the cake sits on a plate, and the plate is the
database.

| Layer | What it does | What lives here |
|---|---|---|
| **Presentation** | What people see and use; shows info and takes clicks/typing, passes requests down and shows results. | UI, Styles, Brand, Front-end code, Pictures |
| **Service** | Sits between screen and rules; every action starts here (often **API routes**); checks "are you allowed?"; runs **every step or none** (undoes a half-done change). *Fowler: the top part of the domain layer.* | API routes, actions like "Sign up", "Are you allowed?" checks, save-every-step-or-none |
| **Domain** | Where the app makes decisions — the business rules (totals, when to send a reminder). Doesn't care how the screen looks or how data is stored. | Web-server scripts, DB-server scripts, business rules |
| **Data Source** | Saves and retrieves data so nothing is lost between visits; the domain layer asks it for data. | Database architecture |
| **Database** *(the plate)* | Where the data actually lives. | Tables, data records, keys that link records, access rules |

### The five DON'Ts
- ❌ **DON'T** put the app's rules in the screens people see.
- ❌ **DON'T** let the rules or the data depend on the screens.
- ❌ **DON'T** spread the app across more servers than you need.
- ❌ **DON'T** write the same rule in two different places.
- ❌ **DON'T** let the screen talk to the database directly.

---

## 5. Technical Architecture Deliverables

The architect's job is to ensure that over time, with more users at once, the app **remains
stable**. If developers just pile code on top of each other, structure gets messy → more bugs,
hard to track. So at the very beginning the architect invests in a **rigorous foundation**; once
built, the system handles traffic, is speedy, usable, and secure.

**a. Choosing programming languages.** Candidates named: SQL, NoSQL, JavaScript, HTML, CSS, PHP,
Python, Ruby, Perl, Java. Each serves a purpose: query/extract data (SQL); present in the browser
(HTML/CSS); logic on clicks/hover (JavaScript); actions on the web server (PHP, Python,
JavaScript, TypeScript).

**b. The software patterns.** Code scripts are actual files, stored and reused; when code runs,
the file loads to run. Software must be architected — like a UI design — so it's speedy, secure,
and efficient over time. **This is called software patterns.**

**c. The database server and web server.** *Web server:* stores code-script files (PHP, Python,
SQL, HTML, CSS, images, JS, TS) and takes requests to send files and perform the site's
operations. *Database server:* stores the database and takes requests from the web server to
return query results.

**d. The HTTP calls and connections.** The HTTP *request* carries the customer's ask to the web
server; the HTTP *response* carries files and data back. **The data comes from the database
server, but always goes through the web server first.**

### The decisions behind the deliverables
- **Choosing languages:** front/middle/back depends on the performance, security, reliability,
  and function you want. Pick languages that fit the purpose; weigh **maintainability** and
  developer accessibility. If you need a database, vet the backend scripting languages for
  architecture/reliability/performance/security over time.
- **Choosing databases:** the purpose of the data drives the type. **Relational** vs
  **non-relational** have completely different architectures. Structured, connected, must-stay-
  accurate data (people, budgets, transactions) → **relational**. Loosely shaped / fast flexible
  records where strict links don't matter → **non-relational**. Host yourself or use a hosted
  tool — *in this class we use **Supabase** (a relational DB server).* Reasons to self-host: more
  security, full ownership, performance standards.
- **Software architecture:** architects must design *the way the app is coded* — **software
  patterns** (repeatable ways to architect code, like a design pattern for UX). Some yield more
  efficient performance based on the sequence of execution; gets complicated across front end,
  middle layer, back end.

---

## 6. The 7-step build flow (high level)

1. **Build your specs** — functional and non-functional requirements.
2. **Decide your technical architecture.**
3. **Document your technical architecture in ADRs.**
4. **Set up the database server.**
5. **Code.**
6. **Push your code and database changes to the servers.**
7. **SHIP IT** — publish it at a web address.

---

## 7. The Language of Change applied to Technical Architecture (9 steps)

Steps 1–3 are discovery; steps 4–9 answer *"what should we commit to now and later?"* — and each
of steps 4–9 **produces an ADR**.

| Step | Question / action | What you produce |
|---|---|---|
| 1 | What's happening right now that needs to change? | Problems as **scenarios** → problem statements |
| 2 | What are the expected outcomes? | Agree on **goals and needs** → user/business goals + needs |
| 3 | How do we know we'll have succeeded? | **Success measurements** |
| 4 | Choose the appropriate **software patterns** | Pattern list + **an ADR for each choice** |
| 5 | Architect the **domain layer** | How business rules are organized + **an ADR** |
| 6 | Architect the **data source layer** | How the app reaches the DB + **an ADR** |
| 7 | Architect the **presentation layer** | Presentation-logic technical requirements + **an ADR** |
| 8 | Architect the **network** | A diagram of where layers run + how they talk + **an ADR** |
| 9 | **Plan for real use** and write down why | Architectural decision records (save all in `docs/adr`) |

**Step 1 — What's happening right now that needs to change?** Describe what people go through
today, **as scenarios**; describe the **problem**, not a solution; list every group and
situation. → problem statements.

**Step 2 — What are the outcomes we need to achieve?** Agree on **goals** and **needs**; write
down needs about **speed, privacy, many users, and change** — these drive the architecture. →
user/business goals + needs.

**Step 3 — How do we know we will have succeeded?** Turn each important need into something you
can **check**, agreed **before anything is built**. → success measurements.

**Steps 4–9 — What should we commit to first, and later?** Turn steps 1–3 into decisions; learn
to choose a pattern, then architect one layer at a time and connect them. **Write an ADR for each
decision.**

**Step 4 — Choose the appropriate software patterns.** Name recurring problems *first*; write
what the fix must handle (what changes, stays safe, must be fast); pick the fitting pattern — *or
no pattern on purpose*; pick the **simplest** choice; record what it prevents, costs, and how
you'll check it.

| Problem | Pattern |
|---|---|
| One job, many ways to do it | Strategy |
| Talking to an outside service | Adapter |
| Something that moves through stages | State Machine |

**Step 5 — Architect the domain layer.** Add a **thin Service Layer** only if a need calls for it.

| Business rules | Pattern |
|---|---|
| Simple rules | Transaction Scripts |
| In-between rules on table-based tools | Table Modules |
| Complex or growing rules | Domain Model |

**Step 6 — Architect the data source layer** (match to Step 5):

| Domain choice | Data-source pattern |
|---|---|
| Transaction Scripts | Gateways |
| Table Modules | Table Data Gateway |
| Simple Domain Model | Active Record |
| Complex Domain Model | Data Mapper |

**Step 7 — Architect the presentation layer.** Keep business rules **out of the screens**; build
for speed; **never let the screen talk to the database directly.**

**Step 8 — Architect the network.** Decide where each layer runs (*our app:* browser / Vercel /
Supabase); draw browser → server → database → back; **HTTPS** everywhere; **secrets on the
server**; server + database in the **same region**; decide timeouts and what to do on **failure**.

**Step 9 — Plan for real use and write down why.** Decide what happens when two people edit the
same thing; keep the app in **one place** unless forced to split; treat each decision as an
**assumption** and test the riskiest first; **one decision per ADR** in `docs/adr`; a changed
decision gets a **new ADR that replaces** the old — **never erase**.

---

## 8. Architectural Decision Records (ADRs)

**What ADRs are.** An ADR (Architecture Decision Record) is a short document that writes down
**one** important choice about how your app is built, and **why**. Each covers only one decision.
Important choices are the ones **hard to change later** — which database, which framework, where
to host.

**Why they're used.** They **remember** decisions (Claude doesn't recall other chats, but reads a
saved ADR in every new one); they **stop drift**; they explain the **"why"**; they help new
people **catch up**; they help you **decide well** (writing options + trade-offs makes you think
first).

**How they're stored.** Each ADR is its own file in `docs/adr`, numbered + short-named
(`0001-use-nextjs.md`); together they're the **decision log**; pushed to GitHub for full history.
When a decision changes, **write a new ADR that replaces the old** and mark it "Superseded by";
**never erase** what was decided.

**The 4 main parts** (Michael Nygard's 2011 template; the class adds a **date** + an **options**
list):
1. **Status** — one word: *Proposed / Accepted / Deprecated / Superseded*, + date.
2. **Context** — the situation that forced the decision. **Facts, not opinions**; include the
   problem, needs, and limits (time/money/tools/skills).
3. **Decision** — the choice, in full sentences starting **"We will…"**; what you chose and why
   over the alternatives.
4. **Consequences** — **every** result, not just the good ones; what gets easier, what gets
   harder, new risks, what to do next.

**Where ADRs live.** In the GitHub repo, next to the code, in `docs/adr` — the decision stays
with the code, GitHub keeps every version, and Claude Code reads repo files so it can check
decisions before writing code. **Don't keep the only copy in a chat, Notion, Docs, FigJam, or on
your computer.**

**The class setup.** (1) Make `docs/adr`. (2) Save each decision as a numbered file. (3) Commit +
push with the code it affects. (4) Add to `CLAUDE.md`: *"Read every ADR in docs/adr before making
changes, and write a new ADR for every big decision."*

*Two worked examples were shown: a "recipe-card" ADR-0001 (Use Next.js with Material UI) and a
real one from the instructor's TechFleet Network Platform (ADR-0001: SPF becomes the single
source of truth) — illustrations of the format, not our content.*

---

## 9. The big lessons from Fowler's *Patterns of Enterprise Application Architecture*

- **Write down the why.** A pattern is a starting point to adapt, *not a recipe to copy* —
  captured in ADRs and checked against when new code ships.
- **What makes enterprise software hard is the data, not the size.** Lots of long-lived business
  data, touched by many people at once, that must fit with other systems.
- **Split the system into layers.** Presentation / domain / data source — and **domain + data
  must never depend on presentation.**
- **Protect the business rules above all.** The domain is the crown jewel; keep it free of the
  screen, web, and database so it can be tested and reused. *Code you can only run via a web
  request is code you cannot trust.*
- **Architecture is the decisions that are hard to change.** Spend your care there; make the rest
  easy to change later.
- **There is no free lunch — every choice is a trade-off.** Name the forces, then pick the option
  whose strengths match them.
- **Start simple. Earn complexity.** Simplest thing that works until a concrete force pushes you
  to the richer option.
- **Bridging objects and tables is most of the work** — exactly what an ORM does.
- **Do not distribute your objects** (Fowler's First Law). Keep it in one process; cross a network
  with **few, large calls**, not many small ones.
- **Measure performance, do not guess.** Watch the slowest, busiest moment, not the average.
- **Guard shared data from day one.** Choose optimistic vs pessimistic locking **on purpose.**

---

## 10. Enterprise architecture pattern catalog (styles)

> *"A pattern describes a problem that repeatedly appears in software and a solution that has
> worked in practice."* — Martin Fowler. **Source:** TechFleet Enterprise Software AI Skills repo
> (`enterprise-architecture-standards/references/software-architecture-styles.md`).
> Cards 1–7 are the core shapes to learn first; 8–15 are advanced styles. **A real app usually
> mixes several.**

| # | Pattern | Solves / when to use | Risks | Example |
|---|---|---|---|---|
| 1 | **Monolith** | Launch fast, one small team, everything in one place. | One big pile gets hard to change; one bad change can break all of it. | A local bakery's order site, built in a weekend. |
| 2 | **Modular Monolith** | One app that stays tidy inside; good for most teams. | Walls must be kept neat on purpose; still can't grow one part alone. | School portal — grades/attendance/messages walled off in one app. |
| 3 | **Microservices** | Many teams shipping independently; parts must scale to very different sizes. | Much more to run; network between parts → more failure modes, harder to debug. | Food-delivery app — search, payments, driver-tracking each on its own. |
| 4 | **Event-Driven** | One event, many parts react, loosely coupled. | Hard to follow order of events; overkill for a simple "give me this now" request. | "Order placed" → charge card, email receipt, tell warehouse. |
| 5 | **Serverless (functions)** | Traffic spikes up/down; no always-on server. | Cold-start wait; poor for long jobs; cost at high volume; vendor lock-in. | A "contact us" form on Vercel — *close to our app's shape.* |
| 6 | **Layered** | Simple, steady app; each layer talks only to the one below. | Layers can tangle, storage leaks up; doesn't help handle more people. | A to-do app — screen / logic / storage in their own layers. |
| 7 | **Hexagonal (Ports & Adapters)** | Core rules shouldn't be glued to one screen/DB; easy to test/swap. | Extra steps for simple apps; overused, makes easy things harder. | Bill-splitter — math in the center, swap screen/storage freely. |
| 8 | **SOA** | Big org; many systems share one central hub. | Hub overloads → single point of failure; heavy rules/approvals; older style. | Bank — website/app/ATM all talk to one central account system. |
| 9 | **CQRS** | Reading and writing need very different designs. | Read side lags write side (stale reads); extra work, overkill for most. | Live sports scores — millions read, few referees write. |
| 10 | **Event Sourcing** | Need a full history / proof of every change. | Big difficulty jump; ever-growing log; rebuilding current state takes care. | Bank account storing every deposit/withdrawal, not just the balance. |
| 11 | **Domain-Driven Design** | Lots of tricky, changing rules; clarify boundaries between business areas. | Overkill for simple apps; needs real domain-expert time; wrong lines are costly. | Hospital — scheduling / billing / patient records, each with own rules. |
| 12 | **Space-Based** | Huge sudden crowds that one DB can't handle; data in shared memory. | Very hard to build/run; keeping copies in step is tricky; rare special case. | Concert-ticket drop — 100k buyers at once. |
| 13 | **Pipeline (Pipes & Filters)** | Data through ordered steps, each one job. | Bad for back-and-forth; one slow/broken step stalls the line; weak at branching. | Photo upload — shrink → strip private info → watermark → save. |
| 14 | **Microkernel (Plugin)** | Add features without risking the core. | Keeping add-on rules steady is hard; a bad add-on can crash all; no scaling help. | Photo editor — core + filters/tools as plugins. |
| 15 | **Cell-Based** | Very large app; isolate users into sealed "cells" so one failure doesn't hit all. | Lots to run; routing users + cross-cell sharing is hard; overkill unless huge. | Global chat app — users in sealed groups; one outage ≠ everyone down. |

---

## 11. Domain-layer business logic — Transaction Script · Table Module · Domain Model (deep dive)

Every app has business rules, and that logic lives in the **domain layer**. Fowler names three
ways to organize it. All three work; the right one depends on **how complex the rules are, and how
complex they'll become.** Not sure? Normal — judge by what the app needs. **Start simple; when the
code tangles as rules grow, that's the signal to move toward a Domain Model.**

**Which fits? (ADHD Budget App examples from the lecture)**
- **Simple, will stay simple → Transaction Script** (add a transaction; show how much is left;
  start a budget over on the 1st).
- **In-between, organized around tables of data → Table Module** (same rules, but screens + code
  pass around tables of rows/columns, like many Microsoft .NET tools).
- **Complex and growing → Domain Model** (budgets on different schedules, roll-over, shared
  budgets, rules that depend on spending pace).

**Transaction Script** — one set of steps per action. *Best for simple rules.*
- *Good when:* rules are simple and stay simple; quick to build; anyone can follow; each action
  runs start-to-finish on its own.
- *Watch out:* the same rule gets **copied** into several places (e.g. "work out what's left"
  written twice) → copies **drift** and give different answers; if-this-then-that chains pile up.
- *Paired with:* Table Data Gateway or Row Data Gateway.

**Table Module** — one piece of code per table, handling every row. *Best for in-between rules.*
- Data arrives as a **record set** (a temp copy of rows/columns); pass a row's **ID** to work on
  one. Fits table-based tools (.NET); easy to test in memory.
- *Watch out:* can't give each row its own rules → different kinds fall back to if/then; every row
  action needs its ID; without table-based tools, Fowler would skip it.
- *Paired with:* Table Data Gateway.

**Domain Model** — objects that match real things, each holding its own data **and** rules.
*Best for complex rules.*
- Add a new behavior = add one new object/strategy; nothing else changes. Stays separate from
  screen and DB.
- *Watch out:* longest to learn (Fowler: months); can feel like hunting object-to-object; saving
  objects to tables is extra work that doesn't pay off for simple rules.
- *Paired with:* **Active Record** (simple model, ~one table) or **Data Mapper** (rich model).

**The three side by side**

| | Transaction Script | Table Module | Domain Model |
|---|---|---|---|
| Organizes code around | Each action a person takes | Each table in the DB | Each real thing in the business |
| Best for | Simple rules | In-between rules, table-based tools | Complex / growing rules |
| Effort to start | Lowest | Low (if tools are table-based) | Highest |
| As rules grow | Rules copied and tangled | Better, but still falls back to if/then | Grows smoothly by adding pieces |
| Paired with | Table/Row Data Gateway | Table Data Gateway | Active Record / Data Mapper |

**Choosing in practice:** start with the simplest that fits today; **you can mix** (Transaction
Scripts for simple parts, a Domain Model for the rest); if Transaction Scripts tangle, move toward
a Domain Model (the reverse is rarely worth it); a strong team makes a Domain Model cheaper; a
**Service Layer** can sit on top of a Table Module or Domain Model to list every action in one
place (see §4).

---

## 12. Design systems & Material UI (the presentation tier)

**What a design system is.** A set of rules + ready-made pieces that make every screen look and
work the same way. Designers design with it; developers build with it; when both use the same
system, **what gets designed is what gets built.** You don't have to be a designer to use one.

**Material UI.** A free, open-source library of ready-made **React** components following Google's
Material Design (currently MD2); 40+ components (Button, Text Field, Table, Alert, Tooltip). *In
this class, the Next.js app uses Material UI for every screen — this is tier 1 (presentation).*
Components: mui.com/material-ui.

**Design words ↔ code words**

| Part | In design (Figma) | In code (Material UI) |
|---|---|---|
| Design tokens | Saved color/font/spacing styles + variables | Values in one **theme** file |
| Colors | primary, secondary, error | `palette.primary.main` |
| Typography | Heading 1, Body | theme typography (`h1`, `body1`) |
| Spacing | a spacing scale | `theme.spacing` — 1 step = **8px** |
| Components | shared library | React components (`<Button>`, `<TextField>`) |
| Variants | filled / outlined | props (`variant="contained"` / `"outlined"`) |
| States | hover / focus / pressed / disabled | built-in states + props (`disabled`) |
| Screen sizes | phone / tablet / desktop frames | breakpoints `xs, sm, md, lg, xl` |
| Guidelines | usage notes | the component's docs page on mui.com |

**Component examples:** `<Button variant="contained">` (SAVE) · `variant="outlined"` (CANCEL) ·
`variant="text"` (LEARN MORE); `<TextField label="Email" />`; `<Alert severity="success">`;
`<Chip label="Budget" />`; `<Switch checked />`.

**How the theme works.** One file holds the design tokens (colors, fonts, spacing, screen sizes),
made with `createTheme`; wrap the app in a `ThemeProvider` so every screen uses it. Change a color
in the theme → every component using it changes. The theme can set per-component defaults. MUI
ships a light + dark theme (light by default).

**How designers + developers work together.** Designers pick the tokens; developers put them in
the theme; designers use MUI pieces so developers don't rebuild from scratch; if a design needs
something MUI lacks, discuss before building; same tokens + pieces → the app matches the design.

**Using Material UI with Claude Code** (lecture guidance, directly relevant to our scaffold):
- *"Set up Material UI in my Next.js app with a theme file"* → Claude follows the MUI-for-Next.js
  steps.
- Give Claude the brand colors/fonts → put them in the theme.
- Use MUI components instead of hand-rolling new ones.
- Ask: *"Does this use the theme, or did you type a color straight into the code?"* —
  **hardcoded colors break the design system.**
- Ask Claude to write an **ADR** for the design-system choices.

---

## 13. Servers & hosting — web server, database server, and where they live

**Web server.** A computer that's always on and connected to the internet; holds the app's files
(pages, styles, pictures, scripts) and runs the server code (e.g. API routes). It waits for
visitors, sends back the right files, runs code that must stay private (secret keys), and asks the
database server for info. *Why:* your laptop isn't always on and others can't reach it; it keeps
secret keys out of people's browsers. *In this class:* **Vercel** runs the web server — each push
to GitHub puts the new version online.

**Database server.** A computer that's always on and saves the app's info in **tables** (rows +
columns). It saves, finds, changes, and deletes info on request, and **checks access rules so each
person only sees what they're allowed to.** *Why:* without it the app forgets everything when the
page closes; it keeps info in one place so everyone sees the same answer, and many people can
read/write at once. *In this class:* **Supabase** runs the database server **and handles accounts
and sign-in.**

**Where servers live — two paths.**
- **Host in a data center (a provider runs it for you).** You sign up, connect your GitHub repo,
  add keys; they keep it running, patch it, back it up. *Good when:* you're new to coding, want to
  build not run servers, want to start free and pay as you grow. *Watch out:* free-plan limits;
  their rules/prices; moving providers later takes work. *Examples:* web — Vercel, Netlify;
  database — Supabase, Neon.
- **Self-host (you run it).** Your own or a rented empty computer; you install and maintain all the
  server software, updates, and backups. *Good when:* a law/contract requires your data on your own
  machines, you need full control, or someone on the team runs servers. *Watch out:* much more to
  learn and set up; the work never stops. *Examples:* web — a DigitalOcean/AWS box you configure;
  database — PostgreSQL you install.

| Factor | Self-hosting | Hosting provider |
|---|---|---|
| Effort | Most complex | Least complex |
| Cost | Most expensive | Least expensive |
| Maintenance | You maintain machines **and** code | They maintain machines; you maintain your code + data |
| Ownership | You own machines **and** code | You own code + data; they own the machines |
| Security | Not secure by default, can make secure | Not secure by default, can make secure |
| Privacy | Not private by default, can make private | Not private by default, can make private |

---

## 14. The class launch checklist (14 steps)

> The course's canonical end-to-end — the detailed class version of the §6 build flow, grouped into
> set-up, build-on-your-computer, and launch-on-the-internet.

**Set up accounts and tools**
1. **Free Vercel + Supabase accounts** (Claude Code + GitHub already done in Week 1); sign up with
   GitHub, free plan on each.
2. **Check your computer** — open Claude Code in a new project folder; confirm Node.js is installed.
3. **Gather your saved documents** — vision, scope, requirements, build order; give them to Claude
   at the start of every new chat.

**Build the app on your computer**
4. **Make the project + GitHub repo** — a new Next.js app using Material UI; push the first version.
5. **Architect the app** — Tier 1 screens (Material UI), Tier 2 server code (Vercel), Tier 3
   database (Supabase); write the plan in a doc in the repo **before** any code.
6. **Write big decisions as ADRs** — make `docs/adr`; add the CLAUDE.md line to read every ADR
   before changes; one ADR per big choice; read, fix, commit, push.
7. **Design your database tables** — from requirements, explained; save as a **migration file** and
   turn on **access rules for every table**.
8. **Connect the app to Supabase** — a new Supabase project (free); Claude writes the SQL for tables
   + access rules. *Way 1:* paste the SQL into Supabase's SQL Editor and Run. *Way 2:* connect
   Claude Code to Supabase (ask it to show the SQL before running). Either way, **save the SQL as a
   migration in the repo** (numbered/dated; never edit a migration that already ran — add a new
   one). **Every DB call from server code, never the browser; keep access rules on as a second
   lock; Supabase keys in a local env file — never in code or on GitHub.**
9. **Build one feature at a time** — start with sign-up/sign-in, then your build order; for each,
   build screen + server code + database together; a new big choice → a new ADR first.
10. **Run and test locally** — start the app, click every screen, **check one person can't see
    another person's information.**

**Launch it on the internet**
11. **Connect GitHub to Vercel** — import the repo; add Supabase keys in Vercel's env-var settings.
12. **Push and let Vercel publish** — each push to `main` publishes a new version; a failed build →
    give Claude the build log.
13. **Test the live app** — open the Vercel URL; sign up as a new person; test everything; mind
    free-plan limits (**Supabase pauses free projects left unused**).
14. **Save what you learned and keep building** — write down what you built + decided, save it in
    the repo, feed it to Claude in the next chat.

---

## 15. When something breaks (troubleshooting)

> *Every problem leaves a clue — find the error message and give it to Claude.* Start where the
> symptom is: screen wrong → **browser**; build failed → **Vercel**; data missing/won't save →
> **Supabase**.

**Browser.** Open dev tools (F12 / Cmd+Option+I) → **Console** (red lines = errors, copy them) →
**Network** (reload, click red requests to see the server's response). **4xx** = request problem
(401 not logged in, 403 not allowed, 404 not found); **5xx** = server code broke (check Vercel).
A private window skips old cached files so you see the newest version.

**Vercel.** Project → **Deployments**; an **Error** deployment → open it, copy the build log for
Claude. Build OK but app breaks → the **Logs** page (server-code errors). **Settings → Environment
Variables:** every key from `.env.local` must be there too, and after changing one you must
**redeploy**. Works locally but not on Vercel → check for a missing key first. *Free plan keeps
logs only ~1 hour — check soon.*

**Supabase.** **Table Editor** → confirm the row actually saved. App shows nothing with no error →
an **access rule** may be hiding rows (RLS hides them without an error). **Authentication** → who
signed up. **Logs** → database errors. Everything stopped → the project may be **paused** ("Resume
project").

**How to ask Claude for help.** Copy the **exact** error (don't retype); say what you did, what you
expected, and what happened; say where you saw it (browser/Vercel/Supabase); ask Claude to explain
the problem in plain words before fixing.

---

## 16. The Week 4 assignment (what's being built & graded) — *the rubric, not the lecture*

> **This is the homework assignment, not lecture content.** Full rubric:
> `https://app.notion.com/p/f4b1a3bddce583c1a1ed0161a0078312`. **Val is on the Premium track.**

**What we're doing.** Turn the Week 2 product specs into a real, working, three-tier web app anyone
can open on the internet — screens in **Next.js + Material UI**, server code on **Vercel**, database
on **Supabase** (no self-hosting). Build the **entire MVP #1** this week.

- **Standard track** (for contrast): build MVP #1 of the **ADHD Budgeting App**.
- **Premium track (ours):** build MVP #1 of **the app you chose from your specialization** — i.e.
  **Community AI Workflow Studio** — with the same tools and your own product specs.

**Deliverables** (from the objective + the "Deliverables for Code and Launch" slide):

*Architecture* — ADRs in `docs/adr` (**≥3**) · database design · software **layer** design ·
software **pattern** design.

*Code* — Next.js app with Material UI · Vercel + Supabase set up · **every MVP #1 feature works** ·
code files in a **new GitHub repo** · a documented **README**.

*Launch* — code pushed to GitHub · database on Supabase · **live app URL on Vercel** · a filled-out
**Submission Template**.

*Also required* — people can **sign up / log in, and each person sees only their own information** ·
a **database diagram**.

*Advanced (optional)* — test the live app with 1–2 real people, write up what you learn, then code
and launch a new version.

---

## 17. Our notes — how this maps to our build *(our synthesis, not the lecture)*

> This section is **our interpretation**, kept separate from the capture above. It links each
> idea to where it already lives in our repo and flags anything worth adopting.

**Already aligned ✅**
- **Four promises** (reliability, scalability, maintainability, security) ↔ the four enterprise
  promises in the [`judge-arch`](../../.claude/skills/judge-arch/SKILL.md) skill and Build Plan
  Steps 5–7. Scalability is our deliberate deferral (**D6 / ADR-14**).
- **The layer model + golden rule + the 5 DON'Ts** ↔ [`ADR-0003`](../adr/0003-internal-server-layering.md)
  (Service → Domain → Data-Source) and the **Leak Test**. The lecture's *"never let the screen
  talk to the database directly"* and *"anything you'd copy to a new screen is a rule in the wrong
  layer"* **are** our Leak Test, almost word-for-word.
- **"Layers are not machines"** ↔ our split between the three *physical tiers* (browser/Vercel/
  Supabase) and the *internal layers* (ADR-0003) — the lecture draws the same distinction.
- **Step 5 (Simple rules → Transaction Scripts)** ↔ **D5**. The lecture also says Transaction-
  Script apps usually **don't need a Service Layer** — consistent with keeping ours thin. The
  deep dive (§11) reinforces it: start simple, mix if needed, move to a Domain Model only if rules
  tangle. Our guardrails as **pure functions in `lib/domain`** (ADR-0003) give each rule **one
  home**, directly countering the "copied rule drifts" risk the lecture warns about.
- **Design system / Material UI** ↔ **ADR-0005** (MUI via `@mui/material-nextjs`). The slide's
  "write an ADR for design-system choices" is exactly ADR-0005. ✅
- **"Serverless… close to our app"** — the lecture explicitly likens the serverless/functions
  shape to a Vercel app; that's our hosting model (**ADR-22**).
- **ADR practice** (Nygard template, `docs/adr`, decision log, supersede-never-erase) ↔ our
  [`docs/adr/README.md`](../adr/README.md) + `ADR-0001`…`0005`. Our "Alternatives considered" =
  the lecture's "options list." ✅
- **Start simple / don't distribute / one process** ↔ YAGNI (**ADR-4**) + monolith (**ADR-0004**)
  + synchronous (**ADR-14**).
- **HTTP / web-server-first / secrets server-side / same region** ↔ **ADR-10, ADR-13, ADR-24**.
- **Hosting choice** ↔ we took the **hosting-provider path** (Vercel + Supabase, free tier —
  **ADR-22 / ADR-2**), matching the lecture's "good when you're new to coding / want to build, not
  run servers." The "not secure/private **by default**" row is exactly why our plan **hardens past
  the default**: default-deny **RLS** (ADR-9), secrets server-side (ADR-13), PII handling (Build
  Plan Step 5).
- **The 14-step class checklist (§14)** ↔ our **Build Plan** + Phase 0 sequence — same shape,
  adapted to the governance product. Step 8's "every DB call from server code, never the browser;
  access rules on as a second lock; keys in a local env file, never in code/GitHub" = **ADR-10/12/13**,
  **RLS (ADR-9)**, secret handling (**NFR-T4/T7**). Step 10's "check one person can't see another's
  info" = our **RLS-isolation test** in the walking skeleton. Step 6's CLAUDE.md ADR line = the
  candidate already flagged.

**🚩 Candidate decisions/ADRs to raise later (not adopted now; would need D2 graduation)**
- **Our architecture style = Layered + Modular Monolith** (cards 6 + 2), on a serverless host
  (card 5). This is implied by ADR-0003/0004/14 but isn't named as a *style* anywhere — a
  one-liner in the Build Plan or an ADR could make our chosen style explicit.
- **Data-source pattern ADR (Step 6):** *Transaction Scripts → Gateways.* No ADR yet; natural to
  write when we build `studio/lib/data` (Phase 0 Step 3).
- **Service Layer stance:** the lecture says Transaction-Script apps often skip it. Worth a line
  on whether our route handlers *are* the thin Service Layer (they are, per ADR-0003) or whether
  we add an explicit one.
- **Concurrency / locking stance ("guard shared data"):** likely light given **ADR-9**
  (one-user-one-org), but worth a one-line decision rather than leaving it implicit.
- **Object↔table bridging / ORM:** our choice is the direct Supabase client in `lib/data` (no
  heavy ORM) — consistent with YAGNI; worth stating explicitly.
- **CLAUDE.md "read every ADR" line:** the lecture recommends adding *"Read every ADR in docs/adr
  before making changes, and write a new ADR for every big decision."* We have the build gate +
  routing + the ADR README, but **no explicit instruction to read existing ADRs before coding**.
  Candidate `CLAUDE.md` addition (needs your approval — nothing changed yet).
- **"Measure performance, don't guess":** points toward named performance NFRs + the eval harness
  (Build Plan Step 7) — already planned; keep in view.
- **"Theme tokens only" rule:** the Material UI slide warns that **hardcoded colors break the
  design system**. Candidate rulebook rule — all colors/spacing/type come from the MUI **theme**,
  never typed straight into a component — which also supports **accessibility** (contrast managed
  centrally). Flag for the scaffold + any UI step.
- *(Practical note, not a decision)* MUI's theme file needs a `"use client"` line at the top (per
  the ADR-0005 example) — remember this at scaffold time.
- *(Practical, from §15)* **Supabase pauses free projects when unused**, and **Vercel's free logs
  last only ~1 hour** — keep both in mind when testing the Phase-0 deploy.

**Assignment issues (from §16) — both resolved**
- **Repo location — DECIDED: keep the `studio/` subfolder** (ADR-0004 stands). Val confirmed a
  subfolder satisfies the premium-track submission; the app lives alongside its specs and ADRs.
- **"Entire MVP #1 this week" — already handled by our release split.** We trimmed MVP #1 into
  **Release 1a** (build & launch now) and **Release 1b** (later); the Kanban holds only the Release
  1a **Must** tickets. So this week we ship the **Release 1a slice** of MVP #1 — named honestly in
  the submission — not every Epic 1–8 feature. No open decision.

**Deliverables status (quick map)**
- ADRs in `docs/adr` (≥3) — ✅ we have **5** (ADR-0001…0005).
- Software **layer** design — ✅ **ADR-0003**. Software **pattern** design — partial (**D5** domain;
  the data-source **Gateways** ADR is still a candidate).
- Database design + **diagram** — spec'd in **Build Plan Step 3**; migrations + an ERD diagram not
  produced yet (Phase-0/early work).
- Next.js + MUI · Vercel + Supabase · live URL · README · Submission Template · auth + per-user
  isolation — **all ahead of us** (Phase 0 and beyond). Per-user isolation = our **RLS** test.

---

## 18. Capture log

- **Batch 1 (2026-11-09):** deliverables-map context; the 7-step build flow; the "How to
  Architect an App Without Being a Technical Expert" slide (big idea + Language of Change + 9
  steps + pattern tables).
- **Batch 2 (2026-11-09):** "What does a Technical Architect do?" (head-chef); "What does
  'Enterprise ready' mean?" (four promises + architect's questions); "Technical Architecture
  Deliverables"; "Fowler's big lessons."
- **Batch 3 (2026-11-09):** the "Architectural Decision Records" slide (what/why/how-stored, the
  4 parts, where they live, class setup, two worked examples). *Deliverables slide in this batch
  was a duplicate of batch 2.*
- **Batch 4 (2026-11-09):** "Layers of Software Architecture" (the cake, the layer panels, the 5
  DON'Ts) and "Enterprise Software Architecture Patterns" (the 15-style catalog).
- **Batch 5 (2026-11-09):** "Three Approaches to Architecting Business Logic in the Domain Layer"
  (Transaction Script / Table Module / Domain Model deep dive, with ADHD Budget App examples,
  side-by-side table, and choosing-in-practice) → §11; "Design Systems 101" + Material UI
  (design↔code vocab, the theme, collaboration, using MUI with Claude Code) → §12.
- **Batch 6 (2026-11-09):** "Web Servers and Database Servers" + "Where do Servers Live?" +
  "How To Choose The Right Path" → §13; "In This Class, This Is How You Launch" (the 14-step
  checklist) → §14; "When Something Breaks" (browser / Vercel / Supabase troubleshooting) → §15.
- **Batch 7 (2026-11-09):** the **Week 4 homework assignment** — "What are we doing?", Summary,
  Standard vs **Premium** objectives (Val = Premium), and "Deliverables for Code and Launch" → §16.
  *Assignment/rubric, not lecture.*
- *Add further batches here as screenshots arrive.*
