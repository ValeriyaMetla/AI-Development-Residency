/**
 * Auth-page copy (Presentation layer, ADR-0003) — kept as a pure, framework-free module so the
 * value-panel wording is unit-testable and lives in one place.
 *
 * Sourcing/honesty rule (same as the landing hero): every promise here must map to a mechanism
 * Release 1b actually ships. No "every output is human-reviewed" (only flagged runs go to a
 * person), no funder-export claim until the responsible-AI summary export exists, no Justice
 * Layer (MMP). The promises reuse the landing page's already-vetted language where they overlap,
 * so the two surfaces stay consistent. `auth-content.test.ts` guards this.
 */

export const AUTH_BRAND = {
  name: 'Community AI Workflow Studio',
  tagline: 'Use AI safely and fairly.',
} as const;

export const SIGNUP_PANEL = {
  heading: 'Set up safe, fair AI for your whole team in minutes.',
  subcopy:
    'You become the Accountable Leader of a new organization — set the rules once, and your team works inside them.',
  promises: [
    'Free safety net, always',
    'Decisions about people go to a person',
    'Free to start — no card required',
  ],
} as const;

export const LOGIN_PANEL = {
  heading: 'Welcome back.',
  subcopy: 'Your AI policy, approvals, and record are right where you left them.',
  promises: ['Governed runs, ready to go', "Your whole team's activity in one place"],
} as const;

/**
 * Early-version safeguard on the sign-up page (decision 2026-11-23, card "Decide whether to publish
 * a formal privacy policy"). Until a reviewed privacy policy and terms exist, sign-up stays open but
 * asks people not to enter real client information. Remove only when that policy is published.
 */
export const SIGNUP_EARLY_NOTE =
  "This is an early version for testing. Please don't enter real client information or details about the people you serve.";
