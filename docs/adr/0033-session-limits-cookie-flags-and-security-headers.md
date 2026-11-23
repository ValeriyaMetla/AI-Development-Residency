# ADR-0033: Sessions end after 24 hours or 1 hour idle (app-side), the session cookie is HttpOnly and Secure, and every response carries a script-strict content security policy and hardening headers

- **Status:** Accepted
- **Date:** 2026-11-23
- **Relates to:** ADR-0003 (layers), ADR-0012 (Vercel hosting), ADR-0013 (Supabase auth), ADR-0029
  (the no-login demo runs no middleware). Corrects the figures in PenTest requirements SR-08 and
  SR-09 (see Context).

## Context

The Week 6 PenTest found:

- **F-05 (P2), sessions never end and the login cookie is readable by scripts.** The Supabase auth
  cookie is set without `HttpOnly` or `Secure` and lasts 400 days (`db/P1-cookies.txt`): the
  `@supabase/ssr` defaults, because the app passes no cookie options (`lib/data/supabase/server.ts`,
  `lib/data/supabase/middleware.ts`). Supabase keeps refreshing the session indefinitely; its own
  session limits need the Pro plan (accepted in R6).
- **F-06 (P2), no clickjacking protection and no content security policy**, and **F-09 (P3)**,
  missing `nosniff`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`, with
  `x-powered-by: Next.js` advertised (`live-lookonly-results.md`, `prod/prod-results.txt`).
  `next.config.ts` sets no headers. HSTS is already sent by Vercel (PenTest row S13, PASS).

**The session figures.** SR-08 ("sign in again after at most 12 hours") and SR-09 ("sign out after
30 minutes without activity") cite NIST SP 800-63B AAL2, marked "cited from memory, to verify". The
current version ([SP 800-63B, 800-63-4](https://pages.nist.gov/800-63-4/sp800-63b.html), dated
26 Aug 2025), AAL2 Reauthentication, says the overall timeout "SHOULD be no more than 24 hours at
AAL2" and "The inactivity timeout SHOULD be no more than 1 hour"; 12 hours is the AAL3 limit
("SHALL be no more than 12 hours"). The 12-hour / 30-minute pair appears to come from the 2017
revision (from a search summary; the 2017 text was not read). The PenTest report also noted that 60
minutes is defensible if 30 proves too strict for nonprofit staff.

Code facts: nothing in the app uses the browser-side Supabase client (`lib/data/supabase/client.ts`
is unused), so the auth cookie never needs to be read by page scripts. MUI's styles are injected by
`AppRouterCacheProvider` (`app/layout.tsx`), which can take a per-request nonce. The middleware runs
on every path except static assets and the demo (ADR-0029).

Forces in tension:

- **Security vs. staff friction.** Being signed out mid-task is annoying (WCAG 2.2.1 Timing
  Adjustable); the timeouts should be the standard's, not stricter by guesswork.
- **No Pro plan**, so time limits must be enforced by the app.
- **A strict content security policy can break MUI.** Inline styles are how MUI works; inline scripts
  are how most XSS works.
- **A nonce makes pages render per request.** Nearly all pages already do, because of sign-in.

## Decision

1. **Session limits (AAL2, current NIST): 24 hours overall, 1 hour idle**, enforced in the middleware.
   - At sign-in the app sets two small `HttpOnly`, `Secure`, `SameSite=Lax` cookies: when the session
     started, and when it was last used. Each request updates "last used".
   - A pure Domain function decides: more than 24 hours since start, or more than 1 hour since last
     use, means expired. The middleware then signs the user out and sends them to the login page with
     a plain message ("For your security, you were signed out. Please log in again.").
   - Missing markers on an existing session (sessions from before this change) start fresh rather
     than signing everyone out at deploy.
   - **SR-08 and SR-09 are corrected** in the PenTest report to 24 hours and 1 hour, with the verified
     citation.
2. **The Supabase auth cookies are `HttpOnly`, `Secure` (on HTTPS only, so local `http://localhost`
   keeps working) and `SameSite=Lax`**, set through `cookieOptions` in both places that create the
   server client.
3. **A content security policy on every page response, strict for scripts:**
   - the middleware makes a fresh random nonce per request; `script-src 'self' 'nonce-…'
     'strict-dynamic'`, so only scripts the server stamps can run; Next.js applies the nonce to its
     own scripts, and the nonce is passed to MUI's `AppRouterCacheProvider`;
   - `style-src 'self' 'unsafe-inline'` (MUI needs inline styles; style injection is far lower risk
     than script injection);
   - `frame-ancestors 'none'` (the clickjacking fix), `object-src 'none'`, `base-uri 'self'`,
     `form-action 'self'`, `default-src 'self'`, `connect-src 'self'`, `font-src 'self'`, `img-src
     'self' data:`;
   - the demo (no middleware, ADR-0029) gets a static policy with the same rules, from the config.
4. **Hardening headers on every response** (`next.config.ts`): `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
   `Cross-Origin-Opener-Policy: same-origin`, and `poweredByHeader: false`. HSTS stays with Vercel.
5. **Proof.**
   - Unit tests: the timeout function (fresh, idle over 1 hour, older than 24 hours, missing markers);
     the cookie options; the CSP builder (nonce present, `frame-ancestors 'none'`, no `unsafe-inline`
     for scripts).
   - A header check against a local production build (the PenTest's own method) on `/`, `/login`,
     `/signup`, `/dashboard` and `/demo`.
   - A browser check: the main screens still look right with no CSP errors in the console; a page
     can't be framed.
   - Live: headers and cookie flags checked in the browser after deploy.

## Alternatives considered

- **Keep SR-08/09 as written (12 h / 30 min).** Rejected: not the current AAL2 values, and stricter
  than needed for this risk level, at a real cost to staff.
- **Rely on Supabase session limits.** Rejected for now: Pro plan only. Revisit if the plan changes;
  the app-side check can then be removed.
- **Shorten only the cookie lifetime.** Rejected: the cookie is re-set on every refresh, so it never
  ends a session; it needs explicit start and last-use markers.
- **A CSP that allows inline scripts too.** Rejected: it would barely limit XSS, which is the point of
  the policy.
- **A full nonce for styles as well.** Rejected for now: fiddly with MUI and likely to break styling;
  scripts are where the real risk is.
- **Headers only, no CSP.** Rejected: `frame-ancestors` and script limits are the F-06 fix.

## Consequences

- **Positive:** a stolen session cookie can't be read by a page script and stops working within a
  day (or an hour idle); the site can't be framed; only the app's own scripts can run; the framework
  is no longer advertised; SR-08/09 now cite the right standard.
- **Negative (accepted):** people are signed out after 1 hour idle or 24 hours, and lose unsaved
  typing in a form at that moment. A warning-before-timeout banner is a possible follow-up.
- **Negative (accepted):** inline styles are still allowed, so a style-injection bug would not be
  blocked by the policy.
- **Negative:** every page now renders per request (nonce); a third-party script added later must be
  allowed in the policy deliberately. Vercel's preview-only toolbar may be blocked on preview
  deployments.
- **Neutral:** no database migration; one PR. The policy and timeout numbers each live in one place
  with a test.
