# Security Research Report — The Service Layer

*Week 6 Coding Challenge — Security Test a Code Base. Follows the Security Research Report
Template (Introduction · Layer · Vulnerabilities · Challenges of Securing This Layer · How to Fix
The Vulnerabilities).*

## Introduction

An app is only ready for real organizations once it is secured as well as built. That means
**information security**, protecting data from being seen, changed or destroyed by the wrong
people. It also means **network security**, protecting the connections that data crosses [study
guide §2].

This report studies both through one layer, the **Service layer**. Every outside request crosses
into the server there, and it is where AI prompt injection enters an app that sends user text to a
model.

It draws on four sources: the OWASP Top 10:2025, the OWASP Cheat Sheet Series, the course's Week 4
and Week 6 material, and our ADRs. Examples come from our app, the **Community AI Workflow
Studio** (Next.js, Supabase and Claude, hosted on Vercel) [ADR-0011, ADR-0012, ADR-0013]. Each
attack is described by its harm to **Confidentiality**, **Integrity** or **Availability** [study
guide §4].

**Terms:**

- **Vulnerability:** a weakness an attacker could use [study guide §2].
- **Attack surface:** every place someone could get in, such as a page, form, login, upload or
  API [study guide §2].
- **Trust boundary:** where data passes from something we don't control, like the browser, into
  something we do, like our server. *(Our definition, based on ADR-0003.)*

The "where in our app" points are places to test, not confirmed weaknesses. The companion PenTest
report checks each one.

## Layer: The Service Layer

### What it is and where it sits

In a layered application, each layer is a group of code with one job, and it only uses the layer
below it [Week 4 lecture reference §4, summarizing Fowler]. The stack runs Presentation → Service
→ Domain → Data Source → Database, and dependencies flow downward only [ADR-0003].

The Service layer is the app's single entrance; the lecture calls it "the top part of the domain
layer" [Week 4 reference §4]. It has three jobs:

- list every action the app offers;
- check that the person is allowed to do it;
- make each action finish completely or not at all.

It holds no business rules; those live in the Domain layer below.

A layer is how code is organized, not where it runs [Week 4 reference §4]. In our app, the
Service layer runs on the Next.js server on Vercel. ADR-0003 names that server as the trust
boundary between the user's browser and the database [ADR-0003; ADR-0012].

### What network aspects are involved

Every click becomes an HTTP request that crosses the internet to the server. The study guide
calls this "Place 2 — The Internet." It lists APIs, HTTP requests, webhooks and the router as its
attack surfaces [study guide §5].

Each request carries an address, form data, headers and a session cookie, and HTTPS protects it
in transit [study guide §10]. The sender controls all of it. That is why the course's tests change
a value in transit and expect the server to reject it [study guide §10].

### A worked example from our app

In our app, the Service layer is the Next.js server actions. ADR-0003 says this layer "verifies
session + role" and is "Kept thin" [ADR-0003]. The Co-Pilot's `assessUse` action
[`studio/app/(app)/copilot/actions.ts`] runs four checks:

- the user is signed in and belongs to an organization;
- the description is non-empty text of 2,000 characters or fewer;
- it reads only the five known risk checkboxes;
- on the server, it re-checks that a risk box is ticked or that the user confirmed none apply.

Only then does it pass the input to the Domain layer. The Claude call sits lower, in
`lib/data/claude.ts`, but the text that reaches the prompt still enters through this layer.
*(Our reading of the code layout.)*

Every outside request crosses the trust boundary here. So this is the first code an attacker's
input reaches, and the last chance to stop it before it touches the business rules or the data.
*(Our synthesis.)*

## Vulnerabilities

Every request from outside reaches the Service layer first, so attacks on it fall into nine
areas. Each area below covers how attackers get in, what it costs in Confidentiality, Integrity or
Availability (CIA) [study guide §4], and where that entry point exists in our app. Categories
follow the OWASP Top 10:2025 [top10.owasp.org/2025]. The app references are *entry points to
test*, not confirmed weaknesses; the PenTest report checks them.

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

**1. Authentication and sessions (A07).** The attacker tries to become a real user, either by
guessing or reusing leaked passwords or by stealing the session cookie that proves someone is
logged in [study guide §10]. They can then read and change that user's data. *In our app:* the
`login` and `signup` actions [`studio/app/auth/actions.ts`] and the session refresh on every
request [`studio/middleware.ts`].

**2. Authorization (A01).** A logged-in user reaches for what isn't theirs: swapping an ID to
reach another organization's records, raising their own role, or calling an action directly. That
last one is specific to this layer. The Next.js docs warn that an exported server action is
"reachable via a direct POST request," and that a page-level login check doesn't protect the
actions inside it [Next.js Data Security guide]. The result is data leaking between
organizations and records changed without the right to change them. *In our app:* every server
action. The policy actions check the caller's role
[`studio/app/(app)/policy-seed/actions.ts`]; the test is whether *every* action does.

**3. Request tampering and forgery (A01, A06).** Using a proxy, the attacker edits a request on
its way to the server, changing a hidden field, a value or an ID, or adding fields the form never
sends [study guide §10]. In cross-site request forgery (CSRF), another website quietly submits a
request using the victim's session [study guide §5]. Next.js server actions only accept POST
requests and abort when the Origin and Host headers don't match [Next.js Data Security guide],
but that protection depends on the framework staying up to date (area 9). *In our app:* the
Co-Pilot's risk checkboxes. `assessUse` already re-checks them on the server and accepts only the
five known keys [`studio/app/(app)/copilot/actions.ts`].

**4. Injection that enters here (A05).** Injection means untrusted input treated as a command
instead of data [study guide §5]. At this layer the main form is **prompt injection**. It can be
typed directly ("ignore your rules") or hidden inside content the AI later reads [study guide
§10; OWASP LLM Prompt Injection Prevention Cheat Sheet]. It can leak data the AI was given, or
produce a wrong governance answer. This layer is also the doorway for SQL and command injection
into the layers below [`secure-coding` rule 2]. *In our app:* the Co-Pilot description goes to
Claude. The system prompt is kept separate from the user's text [`studio/lib/data/claude.ts`],
which helps but doesn't by itself stop injection. *(Our assessment, to be tested.)*

**5. Data in transit (A04).** In a man-in-the-middle attack, someone on the network path reads or
changes requests. This works if traffic isn't encrypted, can be pushed down from HTTPS to plain
HTTP, or carries secrets in web addresses [study guide §5, §10]. It exposes cookies, passwords
and private data. *In our app:* all traffic to the Vercel-hosted app, especially the session
cookie.

**6. Files and payloads (A08).** The attacker sends data built to harm the code that reads it: a
disguised script, an oversized payload, or a structure meant to break the parser [study guide
§10]. The result is corrupted records or a stalled server. *In our app:* the policy JSON import.
`importPolicy` checks sign-in, role and organization, then hands the data to `parsePolicyImport`
[`studio/app/(app)/policy-seed/actions.ts`]; the test is how that parser handles hostile input.

**7. Availability and abuse.** The attacker floods the app with requests, or repeatedly triggers
its most expensive action. For an AI app, that is each model call, so cost and quota run out even
if the server stays up [study guide §10; OWASP Denial of Service Cheat Sheet]. *In our app:*
every action that calls Claude. A text search found no rate limiting; the PenTest should confirm.

**8. Errors, settings and logging (A02, A09, A10).** Unexpected input makes the server leak code
or database details [study guide §10]. Other attacks exploit unsafe defaults (A02), or leave no
trace because nothing is logged (A09). Some succeed because the app fails open instead of
stopping (A10). Leaked details make the next attack easier, and missing logs mean a breach goes
unnoticed. *In our app:* how every action handles errors, and what it logs.

**9. The layer's own software (A03).** The framework can have flaws of its own, and two 2025
flaws hit this layer directly:

- **CVE-2025-29927** let an attacker send Next.js's internal `x-middleware-subrequest` header to
  skip middleware checks, including authentication. It was fixed in 15.2.3; self-hosted apps were
  affected and Vercel-hosted apps were not [Vercel postmortem, March 2025].
- **CVE-2025-55182** in React Server Components allowed remote code execution *without logging
  in*, rated CVSS 10.0. The Next.js fix for the 15.5 line was 15.5.7, and React's later guidance
  names 15.5.10 [React advisory, Dec 2025; Next.js advisory CVE-2025-66478].

*In our app:* we run Next.js 15.5.29 on Vercel, later than every named fix. The advisories don't
name 15.5.29, so calling it patched is our inference; the PenTest should confirm it with a
dependency audit.

## Challenges of Securing This Layer

Being the app's single entrance makes the Service layer the right place for checks, and also hard
to protect completely. Seven barriers stand in the way.

1. **Every action is its own front door.** A server action can be called directly, so each one
   must re-check authentication and authorization itself [Next.js Data Security guide]. One
   forgotten check leaves a door open. Our layering rule is "instruction-strength, not
   compiler-enforced" [ADR-0003], and checks copied by hand drift apart: "scattered copies are
   where gaps appear" [`secure-coding` rule 15].

2. **Real and fake requests look the same.** The server sees only the request, not who sent it or
   why, so it must validate everything itself [study guide §3]. Successful tampering also hides
   well: "Altered data looks normal, so it's trusted for a long time." [study guide §4].

3. **Prompt injection has no complete fix.** To a language model, instructions and data are both
   text, so there is no equivalent of SQL's parameterized query. *(Our synthesis.)* Keeping the
   system prompt separate helps, but it is formatting, not enforcement. Filters also fall short,
   "because a filter cannot stop an attack it fails to detect" [`secure-coding` rule 10].

4. **Security fights usability and cost.** Tight rate limits and lockouts block real users, and an
   attacker can trigger a lockout on purpose to lock a real user out. *(Our reasoning.)* Loose
   limits let an attacker run up the bill, since "every governed run makes several Claude API
   calls" [ADR-0023].

5. **You depend on software you don't control.** A framework flaw can bypass every check the team
   wrote. For the worst 2025 flaw, the only fix was upgrading [Next.js advisory CVE-2025-66478].

6. **The app keeps changing.** Every new action is a new entrance, and time pressure tempts
   shortcuts [ADR-0003]. A NIST study cited in the course found that a problem caught after launch
   costs about 30 times more than one caught at the start [study guide §8].

7. **Attacks blend into normal traffic.** The team only sees attacks it logs, but logs must never
   hold passwords, tokens or personal data [`secure-coding` rule 13; OWASP A09:2025].

No single control covers all seven, so the realistic goal is **defense in depth**: protect each
thing in several places, so that when one control fails, another catches the attack [study guide
§3].

## How to Fix The Vulnerabilities

No single control fixes this layer, so the approach is **defense in depth**: protect each thing in
several places [study guide §3]. Write each check **once**, as a shared check every action calls,
so copies can't drift apart [`secure-coding` rule 15]. Each fix follows an OWASP cheat sheet
[study guide §6].

### Part A. Harden each area

| # | Area | What to harden | How it works | OWASP cheat sheet |
|---|---|---|---|---|
| 1 | Authentication and sessions | Slow or lock repeated failed logins. Set cookies `Secure`, `HttpOnly`, `SameSite`. End sessions at logout and after idle time. | Guessing stops paying off; a stolen cookie is harder to get and stops working. | Authentication; Session Management; Credential Stuffing Prevention |
| 2 | Authorization | In every action, check this user may do *this* action on *this* record. Deny by default. | The server decides each time; hiding a button protects nothing. | Authorization; Insecure Direct Object Reference Prevention |
| 3 | Tampering and forgery | Accept only expected fields and check type, length and range. Keep CSRF protection on. Never change data on GET. | Edited or extra fields are rejected; a cross-site request fails the origin check. | Mass Assignment; Input Validation; Cross-Site Request Forgery Prevention |
| 4 | Injection | Keep instructions apart from untrusted text, enforce the model's limits in code, have a person approve consequential actions, and treat output as untrusted. Use parameterized queries. | The real limits sit outside the model; input stays data. | LLM Prompt Injection Prevention; Query Parameterization |
| 5 | Data in transit | HTTPS everywhere, plus HSTS (a header that tells browsers to always use HTTPS). No secrets in web addresses. | Traffic can't be read or changed on the way. | Transport Layer Security; HTTP Strict Transport Security |
| 6 | Files and payloads | Check content, real file type and size. Parse defensively. | Hostile input stops at the door. | File Upload; Input Validation |
| 7 | Availability | Rate-limit per user and per IP, starting with the AI calls. Set timeouts and size limits. | One caller can't flood the app or run up the bill. | Denial of Service |
| 8 | Errors, settings and logs | Show users a generic error and send the details to a private log. Set security headers. Log failed logins and refused access, never personal data. | Failures teach attackers nothing; the team can trace an attack. | Error Handling; HTTP Headers; Logging |
| 9 | Supply chain | Keep the lockfile, audit dependencies, upgrade quickly. | Framework flaws are patched before they're used. | Vulnerable Dependency Management; NPM Security |

*Sources: `secure-coding` rules 1–15; study guide §9; cheat sheet titles checked against the OWASP
Cheat Sheet Series index.*

### The two hardest fixes

**Access control in every action.** Write the check once as a shared function: signed in, right
organization, right role, allowed on this record. Call it at the top of every action, and add a
test that fails if an action skips it. A forgotten check then becomes a failing build, not an open
door. *(Our suggested pattern, applying `secure-coding` rules 14–15.)*

**Prompt injection.** There's no complete fix, so the important layers sit outside the model:

- keep instructions apart from content;
- enforce in code what the model may do;
- require a person to approve anything consequential;
- treat the model's output as untrusted.

Input filters help with logging but are not the boundary [OWASP LLM Prompt Injection Prevention
Cheat Sheet; `secure-coding` rule 10].

### Part B. What teams should follow

**Product teams make security a requirement.** Start from the threat model and write each rule in
plain words that a test can pass or fail. Add it to the acceptance criteria with a BDD scenario
that includes the attacker's path. Write down any risk the team decides to accept [study guide
§8–§9; `secure-coding` rule 14].

**Development teams code from the cheat sheets,** and give those cheat sheets to the AI coding
tool too. They keep each check in one place and keep secrets and error details private. Every
rule becomes a CI check that blocks the build, and every miss gets a regression check [study
guide §9].

This report names the defenses. The PenTest tests whether our app actually has them, and its
Recommendations turn each real gap into a fix for `studio/`.
