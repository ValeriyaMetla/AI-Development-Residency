import { describe, it, expect } from 'vitest';
import {
  generatePolicyRules,
  type StandardsByCode,
  type SeedStandard,
} from '@/lib/domain/policy-generator';
import {
  EXPECTED_STANDARD_CODES,
  validatePolicySeedAnswers,
  type PolicySeedAnswers,
} from '@/lib/domain/policy-seed-spec';

// A fake resolved-standards map covering every expected code, so the generator can ground rules.
function makeStandards(): StandardsByCode {
  const map = new Map<string, SeedStandard>();
  for (const code of EXPECTED_STANDARD_CODES) {
    map.set(code, {
      id: `id-${code}`,
      citation: `Citation for ${code}`,
      ruleText: `Standard text for ${code}`,
      category: 'cat',
      riskTier: 'all',
    });
  }
  return map;
}

const fullYes: PolicySeedAnswers = {
  accountablePerson: { name: 'Jane Doe', role: 'Executive Director' },
  purposes: ['Drafting communications'],
  handlesSensitiveData: 'yes',
  higherStakes: 'yes',
  externalContent: 'yes',
};

describe('generatePolicyRules — happy path (all yes)', () => {
  it('emits all fixed rules, each grounded with id + citation', () => {
    const rules = generatePolicyRules(fullYes, makeStandards());
    // 15 fixed spec rules when every gate includes (the Epic-0 set plus the three 1b accuracy
    // output-quality baselines, ADR-0042 / 1b).
    expect(rules).toHaveLength(15);
    for (const r of rules) {
      expect(r.standardRuleId).toBeTruthy();
      expect(r.citation).toBeTruthy();
    }
  });

  it('no rule is flagged needs_review when every answer is explicit', () => {
    const rules = generatePolicyRules(fullYes, makeStandards());
    expect(rules.every((r) => r.needsReview === false)).toBe(true);
  });

  it("seed rules use the spec's own wording, not the standard's, and keep their provenance", () => {
    const rules = generatePolicyRules(fullYes, makeStandards());
    const accountable = rules.find((r) => r.sourceQuestion === 'Q1');
    expect(accountable?.ruleText).toContain('Jane Doe (Executive Director)');
    // Every seed rule now has its own "we"-voice text (Val, 2026-11-19); none falls back to the
    // standards library's wording, but each still cites its standard.
    expect(rules.some((r) => r.ruleText.startsWith('Standard text for'))).toBe(false);
    const logging = rules.find(
      (r) => r.ruleText === 'We log how AI is used and review that use regularly.',
    );
    expect(logging).toBeDefined();
    expect(logging?.origin).toBe('baseline');
    expect(logging?.isBaselineSafety).toBe(true);
    expect(logging?.standardRuleId).toBeTruthy();
  });
});

describe('gating', () => {
  it('"no" on Q4 drops the three higher-stakes rules', () => {
    const rules = generatePolicyRules({ ...fullYes, higherStakes: 'no' }, makeStandards());
    expect(rules.some((r) => r.sourceQuestion === 'Q4' || r.sourceQuestion === 'Q4/Q6')).toBe(
      false,
    );
  });

  it('"no" on Q3 drops the data-governance rule', () => {
    const rules = generatePolicyRules({ ...fullYes, handlesSensitiveData: 'no' }, makeStandards());
    expect(rules.some((r) => r.sourceQuestion === 'Q3')).toBe(false);
  });
});

describe('safe defaults', () => {
  it('"not sure" on Q3 includes the rule and flags needs_review', () => {
    const rules = generatePolicyRules(
      { ...fullYes, handlesSensitiveData: 'not_sure' },
      makeStandards(),
    );
    const q3 = rules.find((r) => r.sourceQuestion === 'Q3');
    expect(q3).toBeDefined();
    expect(q3?.needsReview).toBe(true);
  });

  it('a skipped Q5 includes the disclosure rule via the default, flagged', () => {
    const answers: PolicySeedAnswers = {
      accountablePerson: { name: 'Jane', role: 'ED' },
      purposes: ['Research'],
      handlesSensitiveData: 'yes',
      higherStakes: 'yes',
    };
    const q5 = generatePolicyRules(answers, makeStandards()).find((r) => r.sourceQuestion === 'Q5');
    expect(q5?.needsReview).toBe(true);
  });
});

describe('custom prohibited uses (Q7)', () => {
  it('adds a custom rule per non-empty entry, with no standard source', () => {
    const rules = generatePolicyRules(
      { ...fullYes, customProhibitedUses: ['No resume screening', '  ', 'No surveillance'] },
      makeStandards(),
    );
    const custom = rules.filter((r) => r.origin === 'custom');
    expect(custom).toHaveLength(2); // the blank entry is skipped
    for (const r of custom) {
      expect(r.standardRuleId).toBeNull();
      expect(r.citation).toBeNull();
      expect(r.category).toBe('prohibited-use');
      expect(r.sourceQuestion).toBe('Q7');
    }
    expect(custom.map((r) => r.ruleText)).toEqual(['No resume screening', 'No surveillance']);
  });
});

describe('grounding guarantee', () => {
  it('skips a spec rule whose source standard is missing (never emits it uncited)', () => {
    const partial = makeStandards();
    partial.delete('nist-human-oversight');
    const rules = generatePolicyRules(fullYes, partial);
    expect(rules.some((r) => r.sourceQuestion === 'Q1')).toBe(false);
    // Everything that IS emitted still carries provenance.
    for (const r of rules.filter((x) => x.origin !== 'custom')) {
      expect(r.standardRuleId).toBeTruthy();
    }
  });
});

describe('the reviewer rule never reads "myself reviews" (audit M5)', () => {
  /** The generated human-review sentence for a typed Q6 answer, via the same validation the app uses. */
  function reviewerSentence(reviewer: string): string {
    const res = validatePolicySeedAnswers({ ...fullYes, reviewer });
    if (!res.ok) throw new Error('answers should be valid');
    const rule = generatePolicyRules(res.answers, makeStandards()).find((r) =>
      r.ruleText.startsWith('Before higher-stakes AI output is used or sent'),
    );
    return rule!.ruleText;
  }

  it.each(['myself', 'Me', ' I ', 'same person', 'Same as above.'])(
    'turns "%s" into the accountable person',
    (reviewer) => {
      const text = reviewerSentence(reviewer);
      expect(text).toContain('Jane Doe (Executive Director) reviews it');
      expect(text).not.toMatch(/\b(myself|me|same person|same as above)\b/i);
    },
  );

  it('keeps a named reviewer as written', () => {
    expect(reviewerSentence('Ops Manager')).toContain('Ops Manager reviews it');
  });
});
