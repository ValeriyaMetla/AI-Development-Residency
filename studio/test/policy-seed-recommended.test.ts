import { describe, it, expect } from 'vitest';
import {
  POLICY_SEED_SPEC,
  PURPOSE_OPTIONS,
  RECOMMENDED_PURPOSES,
  recommendedSeedAnswers,
  validatePolicySeedAnswers,
} from '@/lib/domain/policy-seed-spec';

/**
 * The "use recommended answers" fast path (Epic 8 minutes-to-value). These defaults decide which
 * safety rules a brand-new org starts with, so the guarantees are pinned here: protective by
 * default (every seed rule on), valid input to the generator, and drawn from the wizard's own
 * purpose list.
 */
describe('recommendedSeedAnswers', () => {
  it('turns ON every seed rule, including all baseline-safety rules', () => {
    const answers = recommendedSeedAnswers('Jane Doe');
    for (const rule of POLICY_SEED_SPEC) {
      expect(rule.gate(answers).include, `rule ${rule.id} should be on`).toBe(true);
    }
  });

  it('leaves all three risk questions at "not sure" (the fail-safe default, never "no")', () => {
    const answers = recommendedSeedAnswers('Jane Doe');
    expect(answers.handlesSensitiveData).toBe('not_sure');
    expect(answers.higherStakes).toBe('not_sure');
    expect(answers.externalContent).toBe('not_sure');
  });

  it('passes the same server-side validation as the full wizard', () => {
    const result = validatePolicySeedAnswers(recommendedSeedAnswers('Jane Doe'));
    expect(result.ok).toBe(true);
  });

  it('names the signed-in leader as the accountable person', () => {
    expect(recommendedSeedAnswers('  Jane Doe ').accountablePerson).toEqual({
      name: 'Jane Doe',
      role: 'Accountable Leader',
    });
  });

  it('still produces a valid accountable person when the leader has no display name', () => {
    const answers = recommendedSeedAnswers('   ');
    expect(answers.accountablePerson.name.trim()).not.toBe('');
    expect(validatePolicySeedAnswers(answers).ok).toBe(true);
  });

  it('recommends only purposes the wizard actually offers', () => {
    const offered = new Set<string>(PURPOSE_OPTIONS);
    for (const purpose of RECOMMENDED_PURPOSES) {
      expect(offered.has(purpose), `"${purpose}" missing from PURPOSE_OPTIONS`).toBe(true);
    }
    expect(recommendedSeedAnswers('Jane Doe').purposes).toEqual([...RECOMMENDED_PURPOSES]);
  });
});
