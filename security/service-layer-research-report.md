# Security Research Report — The Service Layer

*Week 6 Coding Challenge — Security Test a Code Base. Follows the Security Research Report
Template (Introduction · Layer · Vulnerabilities · Challenges of Securing This Layer · How to Fix
The Vulnerabilities). Working draft: sections are added as each one is approved.*

## Introduction

Building an app is only half the job. To be ready for real organizations, it also has to be
secured. That means **information security**, protecting data from being seen, changed or
destroyed by the wrong people, and **network security**, protecting the connections that data
crosses [study guide §2]. This report looks at both through one software layer: the **Service
layer**. We chose it because every request from outside crosses into the server there, and
because it is where AI prompt injection enters an app that sends user text to a model.

The report draws on four sources: the OWASP Top 10:2025, the OWASP Cheat Sheet Series, the
course's Week 4 and Week 6 material, and our own architecture decision records (ADRs). Examples
come from our app, the **Community AI Workflow Studio**. It is built with Next.js and Supabase,
calls Claude for its AI features, and is hosted on Vercel [ADR-0011, ADR-0012, ADR-0013]. Every
attack is described by the harm it does: to **Confidentiality** (who can see data), **Integrity**
(whether data stays correct) or **Availability** (whether the app is there when needed) [study
guide §4].

**Three terms used throughout:**

- **Vulnerability:** a weakness an attacker could use. Not every bug is one, but many start as
  bugs [study guide §2].
- **Attack surface:** every place someone could get in, such as each page, form, login, upload,
  API or outside service. The bigger it is, the more there is to protect [study guide §2].
- **Trust boundary:** the line where data passes from something we don't control, like the
  user's browser, into something we do, like our server. Everything crossing it must be checked.
  *(Our definition, based on how ADR-0003 uses the term.)*

The sections that follow cover four things:

- **Layer:** what the Service layer is and how the network reaches it.
- **Vulnerabilities:** nine areas of attack.
- **Challenges:** why the layer can't be completely protected.
- **How to Fix:** the defenses and the practices teams should follow.

The "where in our app" points in this report are places to test, not confirmed weaknesses. The
companion PenTest report checks each one.

## Layer: The Service Layer

### What the Service layer is

In a layered application, each layer is a group of code with one job, and each layer only uses
the layer below it [Week 4 lecture reference §4, summarizing Martin Fowler's *Patterns of
Enterprise Application Architecture*]. The Service layer is the application's single entrance.
Every action a user can take starts here, such as signing up, saving a policy or asking for an
AI-use assessment.

It has three jobs [Week 4 reference §4]:

1. **List every action the app offers in one place,** so there is one entrance rather than many.
2. **Check whether the person asking is allowed to do the action.**
3. **Make each action either finish completely or not happen at all,** undoing a half-done
   change.

In the layer table from the lecture, the Service layer is described as "the top part of the
domain layer" [Week 4 reference §4]. It is a thin coordinator with no business rules of its own.
The rules live one level down, in the Domain layer.

### Where it sits

The layers stack in this order: Presentation → Service → Domain → Data Source → Database.
Dependencies flow in one direction only. Nothing lower ever imports from something higher
[ADR-0003]. The screen talks only to the Service layer, and the Service layer calls the business
rules [Week 4 reference §4].

A *layer* describes how code is organized, not where it runs. A *tier* usually means a separate
machine [Week 4 reference §4]. In our app, the Service layer runs on the server tier, the Next.js
server hosted on Vercel. ADR-0003 names that server as the trust boundary between the user's
browser and the database [ADR-0003; hosting: ADR-0012].

### What network aspects are involved

The Service layer is where the network delivers its requests. Every click or form submission
becomes an HTTP request. The request leaves the browser, crosses the internet and arrives at the
server. The study guide calls this middle step "Place 2 — The Internet." It lists its attack
surfaces as APIs, HTTP requests, webhooks and the router [study guide §5].

What travels with each request matters as much as the request itself:

- the address and form data;
- the headers;
- the session cookie that identifies the user;
- the HTTPS encryption that protects all of it in transit [study guide §10, Internet / Service
  tests].

The sender controls everything in a request and can change it before it arrives. That is why the
course's tests change a price, an ID or a hidden field in transit and expect the server to reject
it [study guide §10, HTTP tampering].

### A worked example from our app

In our app, the Service layer is the Next.js route handlers and server actions. ADR-0003 says
this layer "verifies session + role," sets transaction boundaries and calls the Domain layer, and
it is "Kept thin" [ADR-0003]. The app has seven server-action files: sign-in and sign-up,
Co-Pilot, setup, policy seed, skills, approvals and usage.

The Co-Pilot's `assessUse` action shows the Service layer doing its job
[`studio/app/(app)/copilot/actions.ts`]. Before any business rule runs, it:

1. **Checks the user is signed in.** If not, it stops with "You must be signed in."
2. **Finds the user's organization.** If there is none, it stops.
3. **Treats the typed description as untrusted.** It must be text, it is trimmed, it can't be
   empty, and it must be 2000 characters or fewer.
4. **Accepts only the five known risk checkboxes,** each set strictly to true or false. Any other
   field in the request is ignored.
5. **Re-checks on the server that the user ticked a risk box or confirmed that none apply.** It
   doesn't trust the form to have done it. The code comment explains why: "a skipped form must
   never come back as "Go ahead"."
6. **Only then passes the checked input to the Domain layer,** which holds the risk-tiering
   rules.

Two supporting pieces sit around this action:

- **`studio/middleware.ts`** refreshes the user's Supabase session on every request before any
  action runs.
- **The Claude call** lives in the Data Source layer (`lib/data/claude.ts`) and is reachable only
  from the server [ADR-0003]. The AI call itself sits lower in the stack, but the text that ends
  up in the prompt still enters through the Service layer. *(This is our reading of the code
  layout, not a sourced claim.)*

### Why this layer is the attacker's way in

Every request from outside crosses the trust boundary at the Service layer. So it is the first
code an attacker's input reaches, and the last chance to stop it before it touches the business
rules or the data. A check that is missing here may not be caught anywhere below. *(This is our
synthesis from the sources above.)* The next section covers the attacks that target this
boundary.

## Vulnerabilities

### How to read this section

Every request from outside reaches the Service layer first, so attacks on it fall into a few
areas. For each area, we cover three things:

- **how attackers get in;**
- **what it costs**, in terms of Confidentiality, Integrity or Availability (CIA) [study guide
  §4];
- **where that entry point exists in our app.**

Each area is tagged with its OWASP Top 10:2025 category [OWASP Top 10:2025,
top10.owasp.org/2025]. The "where in our app" lines name *entry points to test*, not confirmed
weaknesses. Confirming or ruling them out is the job of the PenTest report.

| # | Area | OWASP Top 10:2025 | Main attacks | Mainly hurts |
|---|---|---|---|---|
| 1 | Authentication and sessions | A07 Authentication Failures | Password guessing, stolen session cookies | C, I |
| 2 | Authorization | A01 Broken Access Control | Swapping IDs, calling actions directly, raising your own role | C, I |
| 3 | Request tampering and forgery | A01, A06 Insecure Design | Editing values in transit, cross-site request forgery | I |
| 4 | Injection that enters here | A05 Injection | Prompt injection (typed and hidden), input passed down to SQL or commands | C, I |
| 5 | Data in transit | A04 Cryptographic Failures | Man-in-the-middle, downgrade to plain HTTP | C |
| 6 | Files and payloads | A08 Software or Data Integrity Failures | Malicious, oversized or malformed uploads | I, A |
| 7 | Availability and abuse | (no single Top 10 category) | Request floods, running up AI costs | A |
| 8 | Errors, settings and logging | A02, A09, A10 | Leaky errors, unsafe defaults, attacks left unrecorded | C |
| 9 | The layer's own software | A03 Software Supply Chain Failures | Flaws in the framework itself | C, I, A |

### 1. Authentication and sessions (A07)

**How they get in.** The attacker tries to *become* a real user.

- **Guessing passwords**, or replaying passwords leaked from other sites, against the login
  action.
- **Stealing the session cookie** that proves a user is logged in, then sending it with their own
  requests.

The course's tests reflect both: repeated wrong passwords should trigger a lockout, and a copied
cookie should stop working after logout [study guide §10].

**What it costs.** The attacker acts as the user. They can read that user's data
(Confidentiality) and change it in their name (Integrity).

**Where in our app.** The `login` and `signup` server actions [`studio/app/auth/actions.ts`], and
the session refresh that runs on every request [`studio/middleware.ts`].

### 2. Authorization: broken access control (A01)

**How they get in.** The attacker is a real, logged-in user who reaches for something they
shouldn't have.

- **Swapping an ID** in a request to reach another user's or organization's records.
- **Raising their own role** to unlock actions meant for someone else.
- **Calling the action directly.** This one is specific to this layer. A Next.js server action
  can be called without going through the page that shows it. The Next.js docs say an exported
  action is "reachable via a direct POST request." They tell developers to check authentication
  and authorization inside each action. A page-level login check does not protect the actions
  defined in that page [Next.js Data Security guide].

**What it costs.** One organization's data leaks to another (Confidentiality). Records are
changed by people with no right to change them (Integrity).

**Where in our app.** Every server action. For example, the policy actions check the caller's
role before importing, editing or publishing. One of them returns "Only an Accountable Leader can
import a policy." [`studio/app/(app)/policy-seed/actions.ts`]. The test is whether every action
re-checks this on the server, not just most of them.

### 3. Request tampering and forgery (A01, A06)

**How they get in.**

- **Tampering.** The attacker sits a proxy between their browser and the server and edits a
  request on the way out: changing a hidden field, a value or an ID, or adding fields the form
  never sends. The course's test expects the server to reject the changed request [study guide
  §10].
- **Cross-site request forgery (CSRF).** A different website quietly submits a request to our app
  using the victim's logged-in session [study guide §5, §10].

Next.js gives server actions some built-in protection against CSRF. They only accept POST
requests, and Next.js compares the request's Origin header to the Host header and aborts if they
don't match [Next.js Data Security guide]. That protection depends on the framework being
configured and up to date (see area 9).

**What it costs.** Actions happen that the user never chose, or with values they never entered
(Integrity).

**Where in our app.** The Co-Pilot's risk checkboxes are an obvious tampering target. An attacker
could untick every box to try to get a "Go ahead." `assessUse` already re-checks this on the
server and accepts only the five known keys [`studio/app/(app)/copilot/actions.ts`].

### 4. Injection that enters here (A05)

**How they get in.** Injection means untrusted input is treated as a command instead of as data
[study guide §5]. At the Service layer the main form is **prompt injection**, which arrives two
ways [study guide §10; OWASP LLM Prompt Injection Prevention Cheat Sheet]:

- **Directly.** A user types instructions such as "ignore your rules" into a field that is sent
  to the AI.
- **Indirectly.** Instructions are hidden inside a file, page or other content the AI later
  reads.

The Service layer is also the doorway for SQL and command injection. If it passes untrusted input
down unchecked, the lower layers receive it as if it came from the app [study guide §5;
`secure-coding` rule 2].

**What it costs.** The AI can be talked into leaking data it was given (Confidentiality), or into
giving a wrong governance answer, such as approving a use it should block (Integrity).

**Where in our app.** The Co-Pilot description goes to Claude. The code keeps the system prompt
separate from the user's text: the user's text is sent only as the user message
[`studio/lib/data/claude.ts`]. That separation helps, but it does not by itself stop prompt
injection. *(This is our assessment, to be tested in the PenTest.)*

### 5. Data in transit (A04)

**How they get in.** In a **man-in-the-middle** attack, the attacker sits on the network path,
such as public Wi-Fi or a compromised router, and reads or changes requests as they pass. This
works if traffic isn't encrypted, if the connection can be pushed down from HTTPS to plain HTTP,
or if secrets travel in places that get logged, like web addresses [study guide §5, §10].

**What it costs.** Session cookies, passwords and private data are exposed (Confidentiality).

**Where in our app.** All traffic to the Vercel-hosted app, especially the session cookie on
every request.

### 6. Files and payloads (A08)

**How they get in.** The attacker sends data the server reads in:

- a script disguised as a harmless file;
- a payload large enough to tie up the server;
- a structure built to break the code that parses it.

The course lists these under the web-server tier [study guide §10], but they arrive through a
Service-layer action.

**What it costs.** Corrupted records (Integrity) or a stalled server (Availability).

**Where in our app.** The policy JSON import. `importPolicy` accepts data of an unknown shape and
checks sign-in, role and organization. It then hands the data to `parsePolicyImport` and stops
with an error if parsing fails [`studio/app/(app)/policy-seed/actions.ts`]. The test is how that
parser handles hostile, oversized or malformed input.

### 7. Availability and abuse

**How they get in.**

- **Flooding.** The attacker sends many requests at once.
- **Running up costs.** The attacker repeatedly triggers the app's most expensive action. For an
  AI app, that is each call to the model, so cost and quota run out even if the server stays up.

The course's test expects the API to be rate-limited [study guide §10; OWASP Denial of Service
Cheat Sheet].

**What it costs.** Real users can't get in, and the bill or the AI quota runs out
(Availability).

**Where in our app.** Every action that calls Claude, mainly the Co-Pilot. A text search of
`app/` and `lib/` found no rate limiting. A search can miss things, so the PenTest should confirm
this.

### 8. Errors, settings and logging (A02, A09, A10)

**How they get in.**

- **Leaky errors.** An unexpected input makes the server reveal too much: code, database details
  or how the system is built. The course tests that error pages show none of this [study guide
  §10].
- **Unsafe defaults** (A02 Security Misconfiguration).
- **Unrecorded attacks.** The attack leaves no trace, so nobody notices it is happening (A09
  Security Logging and Alerting Failures).
- **Failing open.** The app handles a failure badly and lets the request through instead of
  stopping it (A10 Mishandling of Exceptional Conditions).

**What it costs.** Leaked details make the next attack easier (Confidentiality). Missing logs
mean a breach can't be found or explained afterwards.

**Where in our app.** How every server action responds to unexpected input and errors, and what
gets logged when it does.

### 9. The layer's own software (A03)

**How they get in.** The framework the Service layer runs on can have flaws of its own. Two real
2025 examples hit exactly this layer in Next.js and React:

- **CVE-2025-29927 — skipping middleware.** Next.js used an internal header,
  `x-middleware-subrequest`, to decide when to skip running middleware. An attacker could send
  that header themselves and skip any checks the middleware performed, including authentication.
  It was rated critical.
  - The fixed versions were 15.2.3 and 14.2.25, plus 13.5.9 and 12.3.5.
  - Self-hosted apps were affected. Apps hosted on Vercel were not [Vercel postmortem on the
    Next.js middleware bypass, March 2025].
- **CVE-2025-55182 — remote code execution in React Server Components.** A flaw in how React
  decodes data sent to server-function endpoints let an attacker run code on the server *without
  logging in*. It scored 10.0 on CVSS, the industry's 0–10 severity scale, which is the maximum.
  Apps could be affected even if they defined no server functions, as long as they used React
  Server Components [React advisory, Dec 3, 2025].
  - Next.js tracked it as CVE-2025-66478, with 15.5.7 as the fix for the 15.5 line.
  - React's later guidance names 15.5.10 [Next.js advisory CVE-2025-66478; React advisory,
    updated Jan 26, 2026].
  - The Next.js advisory states there is no workaround: the only fix is upgrading.

**What it costs.** Potentially everything: Confidentiality, Integrity and Availability at once.
The attacker isn't misusing the app, they are taking over the server.

**Where in our app.** The installed version is Next.js 15.5.29 [`studio/package-lock.json`]. That
is later than every fixed version named above, and the app is hosted on Vercel. **The advisories
do not name 15.5.29 specifically**, so the claim that it carries both fixes is our inference from
version order. The PenTest should confirm it with a dependency audit.

## Challenges of Securing This Layer

The Service layer is the right place for security checks, because it is the app's single
entrance. That same position makes it hard to protect *completely*. Seven barriers stand in the
way of architects and developers.

### 1. Every action is its own front door

A server action can be called directly, so a login check on the page does not protect the
actions that page uses. Each action has to re-check authentication and authorization itself
[Next.js Data Security guide]. One forgotten check leaves a door open, even when every other
action is correct.

Our app has seven server-action files, each with several actions. The rule that keeps checks in
this layer is, in ADR-0003's own words, "instruction-strength, not compiler-enforced" [ADR-0003].
Nothing stops a new action from shipping without its checks.

Copying the same check into every action creates a second risk. The `secure-coding` standard
warns that "scattered copies are where gaps appear" [`secure-coding` rule 15]. The copies drift
apart over time, and one quietly becomes weaker than the rest.

### 2. Real and fake requests look the same

The server sees only the request. It cannot see who really sent it or why. A tampered request,
with a changed ID, an unticked box or an extra field, arrives looking exactly like a normal one.
That is why the first principle is never to trust the user and to validate everything on the
server [study guide §3].

Successful tampering is also hard to notice afterwards. As the study guide puts it, "Altered data
looks normal, so it's trusted for a long time." [study guide §4].

### 3. Prompt injection has no complete fix

SQL injection has a reliable fix: keep the query and the data in separate channels. Prompt
injection does not, because to a language model, instructions and data are both just text.
*(This contrast is our synthesis.)*

Keeping the system prompt separate from the user's text helps, as our app does. But the
`secure-coding` standard treats that separation as formatting, not enforcement. It also warns
that input filters are not the boundary, "because a filter cannot stop an attack it fails to
detect" [`secure-coding` rule 10].

The study guide singles out prompt injection as the attack that can hit Confidentiality,
Integrity and Availability all at once [study guide §4]. For a governance tool, a fooled model
gives a wrong governance answer.

### 4. Security fights usability and cost

Rate limits, lockouts and size limits protect the app, but each one can also block a real user
if it is set too tightly. A lockout can even be turned into a weapon: an attacker deliberately
fails logins to lock a real user out. *(That lockout point is our own reasoning.)*

For an AI app, cost raises the stakes. Every model call costs money [`secure-coding` rule 11],
and ADR-0023 records that "every governed run makes several Claude API calls" [ADR-0023]. Limits
that are too loose let an attacker run up the bill. Limits that are too tight break the product
for the small nonprofits it serves.

### 5. You depend on software you don't control

The Service layer runs on a framework the team didn't write. A flaw in the framework can bypass
every check the team did write, as the two 2025 Next.js and React flaws did (Vulnerabilities,
area 9). For the more severe one, the Next.js advisory stated there was no workaround and the
only fix was upgrading [Next.js advisory CVE-2025-66478].

So part of this layer's security depends on how fast the team learns about a new flaw and ships
the upgrade, not on its own code.

### 6. The app keeps changing, often under time pressure

Every new feature adds a new action, and every new action is a new entrance to secure. ADR-0003
names the pressure directly. Under time pressure, it's tempting to drop a query into a route or a
rule into a component [ADR-0003].

A solo build with an AI coding assistant moves fast, which makes the pressure stronger. *(This is
our observation about this project.)* Late discovery is expensive: a NIST study cited in the
course found a problem caught after launch costs about 30 times more than one caught at the start
[study guide §8]. That is why the course tests at every stage, not just once before launch [study
guide §7].

### 7. Attacks blend into normal traffic

Most attacks on this layer are ordinary-looking requests, so the team only sees them if the app
logs the right things. Two needs pull against each other:

- Logs must record failed logins, refused access and changes to sensitive records, with who and
  when.
- Logs must never contain passwords, tokens or personal data [`secure-coding` rule 13; OWASP
  A09:2025].

Log too little and a breach goes unnoticed. Log carelessly and the logs themselves become
something worth stealing.

### Why this layer can't be completely protected

No single control solves all seven barriers. Checks can be forgotten, prompt injection has no
complete fix, frameworks have flaws of their own, and attacks look like normal use. The realistic
goal is **defense in depth**: protect the same thing in several places, so that when one control
fails, another catches the attack [study guide §3]. The next section sets out those controls for
each vulnerability area.

## How to Fix The Vulnerabilities

No single control fixes the Service layer, so the approach is **defense in depth**: protect each
thing in several places, so one failure doesn't let an attacker in [study guide §3]. Each check
is written **once**, as a shared check every action calls, so copies can't drift apart
[`secure-coding` rule 15]. The fixes follow the OWASP Cheat Sheet Series, which turns each Top 10
risk into concrete defenses [study guide §6].

### Part A. Harden each area

| # | Area | What to harden | How it works | OWASP cheat sheet |
|---|---|---|---|---|
| 1 | Authentication and sessions | Slow down or lock out repeated failed logins. Set session cookies `Secure`, `HttpOnly` and `SameSite`. End sessions at logout and after idle time. | Guessing passwords becomes too slow to pay off. The cookie can't be read by scripts, isn't sent over plain HTTP, and stops working once the user leaves. | Authentication; Session Management; Credential Stuffing Prevention |
| 2 | Authorization | Inside every action, check this user may do *this* action on *this* record. Deny by default. | The server decides on every request, so hiding a button or an ID protects nothing, and nothing is open unless a check opens it. | Authorization; Insecure Direct Object Reference Prevention |
| 3 | Tampering and forgery | Accept only the fields each action expects, and check their type, length and range. Keep the framework's CSRF protection on, plus `SameSite` cookies. Never change data on a GET request. | Extra or edited fields are dropped or rejected. A request sent from another website fails the origin check and doesn't carry the cookie. | Mass Assignment; Input Validation; Cross-Site Request Forgery Prevention |
| 4 | Injection | AI: keep instructions apart from untrusted text, enforce in code what the model may do, require a human to approve consequential actions, and treat the model's output as untrusted. Database: parameterized queries only. | The model can be fooled, so the real limits live outside it. Parameterized queries keep input as data, never as part of the command. | LLM Prompt Injection Prevention; Query Parameterization |
| 5 | Data in transit | HTTPS everywhere, plus HSTS (a header that tells browsers to use HTTPS every time). No secrets in web addresses. | Traffic can't be read or changed on the network, and the browser refuses to fall back to plain HTTP. | Transport Layer Security; HTTP Strict Transport Security |
| 6 | Files and payloads | Check content, real file type and size before parsing. Parse defensively and reject anything that doesn't match the expected shape. | Hostile or oversized input is stopped at the door, before it reaches the code that trusts it. | File Upload; Input Validation |
| 7 | Availability | Rate-limit per user and per IP, starting with the AI calls. Set timeouts and request-size limits. | One caller can't flood the app or run up the AI bill for everyone else. | Denial of Service |
| 8 | Errors, settings and logs | Show users a short, generic error and send the details to a private log. Set security headers. Log failed logins, refused access and sensitive changes with who and when, never passwords, tokens or personal data. | Attackers learn nothing from failures, and the team can spot and trace an attack. | Error Handling; HTTP Headers; Logging |
| 9 | Supply chain | Commit the lockfile, audit dependencies for known flaws, and upgrade quickly when an advisory lands. | Flaws in the framework are found and patched before attackers use them. | Vulnerable Dependency Management; NPM Security |

*Sources for the "what to harden" column: `secure-coding` rules 1–15 and study guide §9; the cheat
sheet titles are checked against the OWASP Cheat Sheet Series index.*

### The two hardest fixes

**Access control in every action.** The Challenges section showed that each server action is its
own front door. Repeating the same check by hand in every action is exactly where gaps appear
[`secure-coding` rule 15]. The fix is to write the check **once** as a shared function (signed
in, right organization, right role, allowed on this record) and call it at the top of every
action. Then add a test that fails if an action skips it. A forgotten check becomes a failing
build instead of an open door. *(The shared function plus the "every action" test is our
suggested pattern, applying rules 14 and 15.)*

**Prompt injection.** There's no complete fix, so the defense goes in layers, and the most
important layers sit outside the model [OWASP LLM Prompt Injection Prevention Cheat Sheet;
`secure-coding` rule 10]:

- **Separate instructions from content,** knowing this helps but doesn't enforce anything.
- **Enforce limits in code:** the model may only take actions the user could take themselves,
  with least privilege for each tool.
- **Require a human to approve** anything consequential before it happens.
- **Treat what the model writes as untrusted** wherever it goes next.

Input filters still earn a place, but as a logging and review aid, not the boundary.

### Part B. What teams should follow

**Product teams: make security a requirement, not an afterthought.** Start from the threat model:
for each threat, write at least one rule in plain words that a test can pass or fail. "Make it
secure" doesn't count [study guide §9; `secure-coding` rule 14]. Each rule then flows down three
steps:

- **Acceptance criteria:** the rule goes into the story's acceptance criteria, so the story isn't
  done until the rule passes.
- **BDD scenario:** each rule gets a Given/When/Then scenario that includes the attacker's path,
  not only the happy path.
- **Recorded decision:** a risk the team decides to accept is written down, not silently skipped
  [study guide §8 step 5].

**Development teams: code from the cheat sheets and let the pipeline enforce them** [study guide
§9]:

- **Give the AI coding tool the cheat sheet,** then check its code against it.
- **Put each check in one place.**
- **Keep secrets and error details private.**
- **Make every rule a CI check that blocks:** security tests, dependency audits and leaked-secret
  scans that fail the build, not just warn.
- **Add a regression check for every miss,** so each problem found once is caught automatically
  from then on.

### From this report to the PenTest

This report names the defenses the Service layer needs. The PenTest report tests whether our app
actually has them, and its Recommendations turn each real gap into a specific fix for `studio/`.
