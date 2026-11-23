import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assess, type SignalInput } from '@/lib/domain/copilot';
import { CAPABILITY_MATRIX, FREE_MONTHLY_RUN_CAP } from '@/lib/domain/entitlements';
import { FAQ } from './faq-content';

/**
 * Honesty guard for the landing-page FAQ. Each answer must stay true to what the product does, so
 * the claims that CAN be tied to code are checked against it here: if the code changes, this test
 * fails and the FAQ gets updated with it.
 */

const allText = () => JSON.stringify(FAQ).toLowerCase();
const answer = (q: string) => FAQ.items.find((i) => i.question === q)!.answer;

const BANNED = [
  'guarantee',
  'certified',
  '100%',
  'completely safe',
  'never wrong',
  'gdpr',
  'hipaa',
];

describe('landing FAQ copy', () => {
  it('has 5–7 questions (card acceptance criterion)', () => {
    expect(FAQ.items.length).toBeGreaterThanOrEqual(5);
    expect(FAQ.items.length).toBeLessThanOrEqual(7);
  });

  it('makes none of the banned over-claims', () => {
    for (const claim of BANNED) expect(allText()).not.toContain(claim);
  });

  it('"the whole safety net is free" matches the code: every safety and oversight capability is free', () => {
    expect(answer("What's free, and what will cost money?")).toMatch(/whole safety net is free/i);
    for (const c of CAPABILITY_MATRIX)
      if (c.kind === 'safety' || c.kind === 'oversight') expect(c.tier).toBe('free');
  });

  it("doesn't publish the placeholder free cap (ADR-0023 calls it tune-later)", () => {
    expect(allText()).not.toContain(String(FREE_MONTHLY_RUN_CAP));
  });

  it('"a person must decide" matches the Co-Pilot: judging a person requires a human decision', () => {
    expect(answer('Can the AI make decisions about people?')).toMatch(/named person must make/i);
    const signals = {
      bannedPurpose: false,
      judgesPerson: true,
      highStakesDomain: false,
      sensitiveData: false,
      outputLeavesOrg: false,
    } as unknown as SignalInput;
    expect(assess(signals).humanDecisionRequired).toBe(true);
  });

  it('links only to the data page, which exists', () => {
    for (const item of FAQ.items) {
      if ('link' in item && item.link) {
        expect(item.link.href).toBe('/your-data');
        expect(existsSync('app/your-data/page.tsx')).toBe(true);
      }
    }
  });

  it('says plainly it is not legal advice', () => {
    expect(answer('Is this legal advice?')).toMatch(/^No\./);
  });
});
