import { describe, it, expect } from 'vitest';
import {
  generatePolicyRules,
  type StandardsByCode,
  type SeedStandard,
} from '@/lib/domain/policy-generator';
import { EXPECTED_STANDARD_CODES, type PolicySeedAnswers } from '@/lib/domain/policy-seed-spec';

// A fake resolved-standards map covering all nine codes, so the generator can ground rules.
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
    // 12 fixed spec rules when every gate includes.
    expect(rules).toHaveLength(12);
    for (const r of rules) {
      expect(r.standardRuleId).toBeTruthy();
      expect(r.citation).toBeTruthy();
    }
  });

  it('no rule is flagged needs_review when every answer is explicit', () => {
    const rules = generatePolicyRules(fullYes, makeStandards());
    expect(rules.every((r) => r.needsReview === false)).toBe(true);
  });

  it('templated rules override the standard text; untemplated inherit it', () => {
    const rules = generatePolicyRules(fullYes, makeStandards());
    const accountable = rules.find((r) => r.sourceQuestion === 'Q1');
    expect(accountable?.ruleText).toContain('Jane Doe, Executive Director');
    const logging = rules.find((r) => r.ruleText === 'Standard text for iso42001-managed-logging');
    expect(logging).toBeDefined();
    expect(logging?.origin).toBe('baseline');
    expect(logging?.isBaselineSafety).toBe(true);
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
