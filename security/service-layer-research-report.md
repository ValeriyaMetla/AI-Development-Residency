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

*Not yet drafted.*

## Challenges of Securing This Layer

*Not yet drafted.*

## How to Fix The Vulnerabilities

*Not yet drafted.*
