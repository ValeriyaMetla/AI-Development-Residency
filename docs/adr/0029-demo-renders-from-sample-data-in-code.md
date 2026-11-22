# ADR-0029: The no-login demo renders from fixed sample data in code and never touches the database

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Epic 8's "Fast time-to-value" bet asks whether a funder or nonprofit lead grasps the value fast
enough to sign up. The card "Add a no-login demo so visitors can try the product" (Release 1b,
Could) answers it with a public `/demo` page: a sample organization showing a governed run with
personal data stripped, a rule-check, a provenance label, a pending approval and the audit trail.
Val locked the scope to a read-only demo with the AI faked and nothing saved. Live model input
for visitors (a sandbox) is a separate future card that needs rate-limiting and abuse controls.

This is the first part of the app open to people who aren't signed in, which is why it gets an
ADR. Today the logged-out database role is granted nothing
(`20261112010000_rls_policies.sql`), and every org-scoped table is default-deny under RLS keyed
to the signed-in user's organization (ADR-0013).

Forces in tension:

- **Isolation vs. realism.** The demo should look like the real product, but it must never be
  able to read or write a real organization's data.
- **The public key reaches the database directly.** Anyone can call the database with the public
  key, skipping the app (threat-model crossing C7, ADR-0028). Anything granted to the logged-out
  role is open to the whole internet, not just to demo visitors.
- **No admin key in app code.** The service-role key bypasses every rule and stays out of app
  code paths (ADR-0007, ADR-0013).
- **Honesty.** The demo must not imply the AI ran, or that a visitor's actions were saved.
- **No personal data.** Visitors must not be able to type real personal details into a public
  page.
- **YAGNI.** This is a Could card. It shouldn't take on infrastructure that only the future
  sandbox card needs.

## Decision

**`/demo` renders a fictional sample organization from fixed data in the code. It makes no
database call and no model call, signs no one in, and saves nothing. The safety steps it shows
are the app's real code; only the AI draft is prewritten.**

1. **A public route outside the signed-in app.** The demo lives at `studio/app/demo/`, outside
   the `(app)` route group, so it doesn't use the signed-in shell. It never calls Supabase Auth,
   so visiting it creates no session.
2. **Sample data is one typed file in the code.** A single file, `studio/lib/demo/sample-org.ts`,
   holds the sample organization: its policy and rules, 2–3 runs, one run waiting for approval,
   and its audit trail. It is typed against the app's real types, so a change to the real data
   shape breaks the build instead of drifting silently. Every person and detail is invented, and
   any personal data in a sample is obviously fake (for example, `555` phone numbers and
   `example.com` email addresses).
3. **Real safety code, prewritten AI draft.** The AI draft in each sample run is canned text.
   The personal-data strip (`detectPii` / `redactPii`, `lib/domain/pii.ts`) and the rule-check
   (`ruleCheck`, `lib/domain/guardrails.ts`) run on that text for real. Both are pure functions
   with no imports (ADR-0003), so the demo shows the product's actual safety behavior without
   touching data or a model.
4. **Preset choices only.** Visitors pick from a few preset sample requests. There is no
   text box anywhere in the demo, so no real personal data can be typed in.
5. **An honest provenance label.** The demo never shows the real label (`AI_PROVENANCE`,
   "AI-generated with Claude (Sonnet)"), because no AI ran. Sample drafts carry their own label
   saying the draft was written in advance for the demo. Final wording is set in the UI step.
6. **Read-only.** The demo has no server actions and submits no forms. The approval step is
   shown with its approve/reject controls inactive and an explanation that approving takes an
   account. It doesn't reuse the live wiring in `review-actions.tsx`.
7. **Labeled on every screen.** Every demo screen carries the banner "Demo organization —
   sample data, nothing is saved", plus sign-up links. The landing hero gets a **Demo** button
   next to Log in.
8. **Isolation is enforced by checks, not convention:**
   - **A new arch-gate rule** (`arch-gate.config.json`) fails the build if any file under
     `studio/app/demo/` or `studio/lib/demo/` mentions `lib/data`, `@supabase/`,
     `@anthropic-ai/sdk`, `createClient(` or `supabase.from(`.
   - **A static migration test** fails if any migration grants the logged-out role (`anon`)
     a privilege or adds an RLS rule that names it.
   - **A render test** proves the demo renders from the sample file alone.
9. **The live sandbox stays out.** Visitors typing into a live model is the separate future card
   (rate limits, abuse controls). It gets its own ADR and may revisit this one.

## Alternatives considered

- **Seed the demo org in the real database and let the logged-out role read it through RLS** —
  rejected: it ends the "logged-out role gets nothing" rule on real tables. Because the public
  key reaches the database directly (threat-model crossing C7, ADR-0028), one mistake in that
  rule would expose real organizations to anyone on the internet. The demo org's rows would
  also sit inside the real tables, reports and audit log.
- **Seed the demo org in the real database and read it on the server with the service-role
  key** — rejected: it puts the key that bypasses every rule into a public code path, against
  ADR-0007 and ADR-0013.
- **A separate Supabase project just for the demo** — rejected for now: it isolates for real,
  but it adds a second project, a second set of keys, and migrations to keep in step. That's
  too much for a Could card whose content never changes.
- **Screenshots or a recorded walkthrough instead of a page** — rejected: the card's bet is
  that visitors *try* the product. A static picture can't show the safety steps reacting to a
  choice.
- **A live sandbox (visitors type into a real model)** — out of scope by Val's decision. It
  needs rate limits and abuse controls, and gets its own card and ADR.

## Consequences

- **Positive:** the demo adds no new way into the database. The logged-out role stays at
  zero access, and the checks in point 8 keep it there. No migration and no Supabase step are
  needed. There's no model cost and nothing for abusers to drive. The personal-data strip and
  the rule-check the visitor sees are the product's real code, so the demo can't overstate what
  the product does.
- **Negative (the point):**
  - **The sample data is a second copy of the product's content.** The real types catch a
    change in the data's shape, but not a change in meaning, such as a renamed status or a
    new review step. Someone has to update the sample file when the product changes.
  - **The demo proves nothing about the real data path.** It doesn't exercise RLS, sign-in or
    the pipeline's database writes. It must never be cited as evidence that those work.
  - **The arch-gate rule reads only the demo's own files.** It matches text and doesn't follow
    imports. If a demo file imports a Domain module that itself reaches data or a model, the
    rule won't see it. Today the demo uses only `pii.ts` and `guardrails.ts`, which have no
    imports. Any new import from the demo needs the same check by hand in review.
  - **The migration test reads the migration files, not the live database.** CI has no
    database access (ADR-0016). The live side needs Val's one-time read-only check, as with
    ADR-0026. The test must flag only grants and RLS rules that let the logged-out role in,
    not the existing `revoke` statements that mention it (`20261118040000_revoke_truncate.sql`).
  - **Changes to the real safety code show up in the demo.** If `pii.ts` or `guardrails.ts`
    changes, the demo's output changes too, and its render test may need updating. That's
    honest, but it's upkeep.
- **Neutral:** the sample organization is in the public repo, which is fine because it's
  fictional. The demo pages can be served as static pages. A future live sandbox would get its
  own ADR and might supersede this one.
