# Security Research Report — The Service Layer

*Week 6 Coding Challenge — Security Test a Code Base. Follows the Security Research Report
Template (Introduction · Layer · Vulnerabilities · Challenges of Securing This Layer · How to Fix
The Vulnerabilities). Working draft: sections are added as each one is approved.*

## Introduction

*To be written last, once the other sections are done.*

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

*Not yet drafted.*

## How to Fix The Vulnerabilities

*Not yet drafted.*
