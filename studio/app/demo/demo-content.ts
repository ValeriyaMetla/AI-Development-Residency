/**
 * Copy for the no-login demo (ADR-0029). Kept in one place, like `auth-content.ts`, so every demo
 * screen says the same thing and a test can pin the wording the card requires.
 */

/** The banner every demo screen carries (card acceptance criterion; ADR-0029 point 7). */
export const DEMO_BANNER = {
  heading: 'Demo organization — sample data, nothing is saved',
  detail:
    'Riverbend Community Pantry is fictional. No AI runs here, and nothing you choose is stored.',
} as const;

export const DEMO_INTRO = {
  heading: 'See the safety net at work',
  body:
    'Pick a sample request and watch what happens to it: personal details stripped out, the ' +
    "draft checked against the pantry's AI rules, and anything risky sent to a person to review.",
} as const;

/** Wording for the governed-run section (T5). Step order matches the real pipeline. */
export const DEMO_RUN_COPY = {
  heading: 'Try a sample request',
  pickerLabel: 'Choose a sample request',
  stepsLabel: 'What happened to the sample request',
  steps: {
    request: 'The request, as a staff member typed it',
    pii: 'Personal details removed before anything else happens',
    draft: 'The draft',
    ruleCheck: "Checked against the pantry's AI rules",
  },
  piiFoundHeading: 'What the safety check found in this sample request',
  outcomePrefix: 'Outcome:',
} as const;

export const DEMO_CLOSING = {
  heading: 'Ready to set your own rules?',
  body: 'Your team gets the same safety net, free.',
} as const;

export const DEMO_CTA = {
  signUp: 'Sign up free',
  logIn: 'Log in',
} as const;
