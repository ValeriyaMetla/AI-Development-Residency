import { describe, it, expect } from 'vitest';
import {
  AUTH_BRAND,
  SIGNUP_EARLY_NOTE,
  SIGNUP_PANEL,
  LOGIN_PANEL,
  RESET_PANEL,
} from './auth-content';

/**
 * Honesty guard for the auth-page value panels. UI copy must not over-claim: every promise maps
 * to a mechanism Release 1b actually ships. This test fails if a banned marketing claim creeps
 * into the panel copy — the same rule the landing hero follows, pinned here so it can't drift.
 */

const ALL_PANELS = [SIGNUP_PANEL, LOGIN_PANEL, RESET_PANEL] as const;

// Claims the product does NOT make yet (or ever). Lower-cased substrings.
const BANNED_CLAIMS = [
  'justice layer',
  'every output',
  'human-reviewed',
  'fully reviewed',
  'all outputs',
  'funder export',
  'export to funders',
  'guarantee',
  'guaranteed',
  'certified',
  'compliant',
  'legal advice',
];

function panelStrings(panel: (typeof ALL_PANELS)[number]): string[] {
  return [panel.heading, panel.subcopy, ...panel.promises];
}

describe('auth panel copy', () => {
  it('names the product consistently', () => {
    expect(AUTH_BRAND.name).toBe('Community AI Workflow Studio');
    expect(AUTH_BRAND.tagline.length).toBeGreaterThan(0);
  });

  it('shows at least one promise per panel', () => {
    for (const panel of ALL_PANELS) {
      expect(panel.promises.length).toBeGreaterThan(0);
      expect(panel.heading.length).toBeGreaterThan(0);
    }
  });

  it('makes no banned over-claim in any panel string', () => {
    for (const panel of ALL_PANELS) {
      for (const text of panelStrings(panel)) {
        const lower = text.toLowerCase();
        for (const claim of BANNED_CLAIMS) {
          expect(lower, `"${text}" must not claim "${claim}"`).not.toContain(claim);
        }
      }
    }
  });
});

describe('sign-up early-version note', () => {
  it('says plainly it is an early version and asks for no real client information', () => {
    expect(SIGNUP_EARLY_NOTE).toMatch(/early version/i);
    expect(SIGNUP_EARLY_NOTE).toMatch(/real client information/i);
  });

  it('makes no banned claim', () => {
    for (const claim of BANNED_CLAIMS) expect(SIGNUP_EARLY_NOTE.toLowerCase()).not.toContain(claim);
  });
});
