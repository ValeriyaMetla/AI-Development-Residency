import { describe, it, expect } from 'vitest';
import {
  POLICY_SEED_SPEC,
  EXPECTED_STANDARD_CODES,
  type PolicySeedAnswers,
} from '@/lib/domain/policy-seed-spec';

const baseAnswers: PolicySeedAnswers = {
  accountablePerson: { name: 'Jane Doe', role: 'Executive Director' },
  purposes: ['Drafting communications'],
  handlesSensitiveData: 'yes',
  higherStakes: 'yes',
  externalContent: 'yes',
};

describe('POLICY_SEED_SPEC coverage', () => {
  it('covers all nine baseline standard_rule codes (no orphans)', () => {
    const covered = new Set(POLICY_SEED_SPEC.map((r) => r.standardCode));
    for (const code of EXPECTED_STANDARD_CODES) {
      expect(covered.has(code)).toBe(true);
    }
  });

  it('references only known standard codes', () => {
    const known = new Set<string>(EXPECTED_STANDARD_CODES);
    for (const rule of POLICY_SEED_SPEC) {
      expect(known.has(rule.standardCode)).toBe(true);
    }
  });

  it('has unique spec ids', () => {
    const ids = POLICY_SEED_SPEC.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('gates', () => {
  it('always-on rules include regardless of answers, never via default', () => {
    const alwaysOn = POLICY_SEED_SPEC.filter(
      (r) =>
        r.sourceQuestion === null ||
        r.sourceQuestion === 'Q1' ||
        r.sourceQuestion === 'Q2' ||
        r.sourceQuestion === 'Q7',
    );
    for (const rule of alwaysOn) {
      expect(rule.gate(baseAnswers)).toEqual({ include: true, viaDefault: false });
    }
  });

  it('a "no" answer excludes the gated rule (Q3 data governance)', () => {
    const q3 = POLICY_SEED_SPEC.find((r) => r.id === 'q3-data-governance')!;
    expect(q3.gate({ ...baseAnswers, handlesSensitiveData: 'no' }).include).toBe(false);
    expect(q3.gate({ ...baseAnswers, handlesSensitiveData: 'yes' })).toEqual({
      include: true,
      viaDefault: false,
    });
  });

  it('"not_sure" includes via the safe default (Q4 check-output)', () => {
    const q4 = POLICY_SEED_SPEC.find((r) => r.id === 'q4-check-output')!;
    expect(q4.gate({ ...baseAnswers, higherStakes: 'not_sure' })).toEqual({
      include: true,
      viaDefault: true,
    });
  });

  it('a skipped optional answer includes via the safe default (Q5 disclose)', () => {
    const q5 = POLICY_SEED_SPEC.find((r) => r.id === 'q5-disclose-ai')!;
    const withoutQ5: PolicySeedAnswers = {
      accountablePerson: baseAnswers.accountablePerson,
      purposes: baseAnswers.purposes,
      handlesSensitiveData: baseAnswers.handlesSensitiveData,
      higherStakes: baseAnswers.higherStakes,
    };
    expect(q5.gate(withoutQ5)).toEqual({ include: true, viaDefault: true });
  });
});

describe('text templates', () => {
  it('Q1 names the accountable person', () => {
    const q1 = POLICY_SEED_SPEC.find((r) => r.id === 'q1-accountable-person')!;
    expect(q1.text!(baseAnswers)).toContain('Jane Doe, Executive Director');
  });

  it('Q2 lists the selected purposes', () => {
    const q2 = POLICY_SEED_SPEC.find((r) => r.id === 'q2-purpose')!;
    expect(q2.text!({ ...baseAnswers, purposes: ['Summarizing', 'Research'] })).toContain(
      'Summarizing, Research',
    );
  });

  it('Q4/Q6 names the given reviewer, else falls back to the accountable person', () => {
    const override = POLICY_SEED_SPEC.find((r) => r.id === 'q4-human-override')!;
    expect(override.text!({ ...baseAnswers, reviewer: 'Operations Manager' })).toContain(
      'Operations Manager',
    );
    expect(override.text!({ ...baseAnswers, reviewer: '  ' })).toContain(
      'Jane Doe (Executive Director)',
    );
  });
});
