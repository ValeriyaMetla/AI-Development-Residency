import { describe, expect, it } from 'vitest';
import { needsReviewCount, showsNeedsReview } from '@/lib/domain/policy-review-labels';
import { generatePolicyRules, type StandardsByCode } from '@/lib/domain/policy-generator';
import { EXPECTED_STANDARD_CODES, recommendedSeedAnswers } from '@/lib/domain/policy-seed-spec';

describe('showsNeedsReview — only where the Leader can act on it', () => {
  it('an unlocked rule filled from a default → shows Needs review', () => {
    expect(showsNeedsReview({ needsReview: true, isBaselineSafety: false })).toBe(true);
  });

  it('a locked safety-floor rule never shows Needs review, even if filled from a default', () => {
    expect(showsNeedsReview({ needsReview: true, isBaselineSafety: true })).toBe(false);
  });

  it('a rule the Leader answered for → no Needs review', () => {
    expect(showsNeedsReview({ needsReview: false, isBaselineSafety: false })).toBe(false);
  });

  it('the "flagged for your review" count matches the rules that show the tag', () => {
    expect(
      needsReviewCount([
        { needsReview: true, isBaselineSafety: false },
        { needsReview: true, isBaselineSafety: true },
        { needsReview: false, isBaselineSafety: false },
      ]),
    ).toBe(1);
  });
});

describe('the recommended-answers starter policy (the screen Val reviewed)', () => {
  const standards: StandardsByCode = new Map(
    EXPECTED_STANDARD_CODES.map((code) => [
      code,
      {
        id: `sr-${code}`,
        citation: 'cite',
        ruleText: `Text for ${code}.`,
        category: 'x',
        riskTier: 'all',
      },
    ]),
  );
  const rules = generatePolicyRules(recommendedSeedAnswers('Val'), standards);

  it('no locked safety-floor rule is ever flagged for review', () => {
    for (const r of rules.filter((x) => x.isBaselineSafety)) {
      expect(showsNeedsReview(r)).toBe(false);
    }
  });

  it('every rule that shows "Needs review" can be edited after activation', () => {
    for (const r of rules.filter(showsNeedsReview)) {
      expect(r.isBaselineSafety).toBe(false);
    }
    // Some defaults were filled in, so there is something honest to review.
    expect(rules.some((r) => r.needsReview)).toBe(true);
    expect(needsReviewCount(rules)).toBeLessThan(rules.filter((r) => r.needsReview).length);
  });
});
