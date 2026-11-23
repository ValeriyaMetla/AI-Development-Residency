import { describe, expect, it } from 'vitest';
import { detectPii, redactPii } from '@/lib/domain/pii';
import { PRIVACY_EMAIL, YOUR_DATA } from './your-data-content';

/**
 * Honesty guard for the "How we handle your data" page. The page may only claim what the product
 * enforces today (audited fact sheet, 2026-11-23). These checks tie its key claims to the code
 * where they can, and fail if over-claiming language creeps in.
 */

/** Every visible string on the page, flattened. */
function allText(): string {
  return JSON.stringify(YOUR_DATA).toLowerCase();
}

const BANNED = [
  'guarantee',
  'certified',
  'compliant',
  'gdpr',
  'hipaa',
  '100%',
  'completely secure',
  'never shared',
  'we never sell',
  'bank-level',
  'military-grade',
];

describe('your-data page copy', () => {
  it('makes none of the banned over-claims', () => {
    const text = allText();
    for (const claim of BANNED) expect(text).not.toContain(claim);
  });

  it('says plainly it is not legal advice, early, and not a privacy policy', () => {
    expect(YOUR_DATA.label).toMatch(/not legal advice/);
    expect(YOUR_DATA.earlyVersion.lead).toMatch(/early version/i);
    expect(allText()).toContain('no formal privacy policy');
  });

  it('names exactly the four kinds of details the code removes', () => {
    // If pii.ts starts detecting more kinds, this test fails so the page gets updated too.
    const sample = 'a@example.org 555-555-0199 123-45-6789 4111 1111 1111 1111';
    expect(
      detectPii(sample)
        .map((f) => f.category)
        .sort(),
    ).toEqual(['credit_card', 'email', 'phone', 'us_ssn']);
    const removed = YOUR_DATA.ai.items[0].text;
    for (const kind of [
      'email addresses',
      'phone numbers',
      'social security numbers',
      'card numbers',
    ])
      expect(removed.toLowerCase()).toContain(kind);
  });

  it('keeps the gaps on the page as plainly as the protections', () => {
    const notYet = JSON.stringify(YOUR_DATA.notYet).toLowerCase();
    for (const gap of ['names', 'street addresses', 'health', 'notes', 'delete', 'privacy policy'])
      expect(notYet).toContain(gap);
  });

  it('says who inside the organization and the operator can see the data', () => {
    const access = JSON.stringify(YOUR_DATA.access).toLowerCase();
    expect(access).toContain('everyone in your organization');
    expect(access).toContain('the person who runs the studio');
  });

  it('gives every provider fact a link to the provider’s own page', () => {
    for (const p of YOUR_DATA.providers.items) {
      expect(p.links.length).toBeGreaterThan(0);
      for (const l of p.links)
        expect(l.href).toMatch(/^https:\/\/(privacy\.claude\.com|supabase\.com|vercel\.com)\//);
    }
  });

  it('publishes the labelled privacy inbox, which the PII filter would itself catch', () => {
    expect(PRIVACY_EMAIL).toBe('communityaistudio+privacy@gmail.com');
    // Sanity: it's a real email shape (the app would strip it if typed into a request).
    expect(redactPii(PRIVACY_EMAIL).redacted).toBe('[email removed]');
  });
});
