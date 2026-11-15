import { describe, it, expect } from 'vitest';
import { ruleCheck, mostSevere, type PolicyRuleLike } from '@/lib/domain/guardrails';

const DATA_RULE: PolicyRuleLike = {
  ruleText: 'Minimize and protect sensitive information.',
  category: 'data-protection',
};
const OVERSIGHT_RULE: PolicyRuleLike = {
  ruleText: 'A person has the final say.',
  category: 'human-oversight',
};

describe('ruleCheck — empty output (safety baseline, ADR-0014)', () => {
  it('blocks empty output regardless of policy', () => {
    expect(ruleCheck('').result).toBe('block');
    expect(ruleCheck('   \n ', [DATA_RULE]).result).toBe('block');
  });
  it('block wins over everything (precedence)', () => {
    const r = ruleCheck('', [DATA_RULE]);
    expect(r.result).toBe('block');
  });
});

describe('ruleCheck — clean output passes (low false-positives)', () => {
  it('passes normal output with no active rules', () => {
    expect(ruleCheck('Thank you so much for your generous gift!').result).toBe('pass');
  });
  it('passes normal output even with a data-protection rule and no contact detail', () => {
    expect(ruleCheck('Thank you for supporting our work this year.', [DATA_RULE]).result).toBe(
      'pass',
    );
  });
  it('does not flag a long non-phone number', () => {
    expect(ruleCheck('Our reference ID is 123456789012345.', [DATA_RULE]).result).toBe('pass');
  });
});

describe('ruleCheck — contact-detail flag (only when a data-protection rule is active)', () => {
  it('flags an email when a data-protection rule is active', () => {
    const r = ruleCheck('Reach me at jane.doe@example.org for details.', [DATA_RULE]);
    expect(r.result).toBe('flag');
    expect(r.reason).toMatch(/minimize personal information/i);
  });
  it('flags a separated phone number when a data-protection rule is active', () => {
    expect(ruleCheck('Call 555-123-4567 to confirm.', [DATA_RULE]).result).toBe('flag');
  });
  it('does NOT flag contact details when no data-protection rule is active', () => {
    expect(ruleCheck('Reach me at jane.doe@example.org.', [OVERSIGHT_RULE]).result).toBe('pass');
    expect(ruleCheck('Reach me at jane.doe@example.org.').result).toBe('pass');
  });
});

describe('mostSevere — combining findings (block > flag > pass, ADR-0015)', () => {
  it('block wins over flag and pass', () => {
    const r = mostSevere([
      { result: 'pass', reason: 'a' },
      { result: 'block', reason: 'b' },
      { result: 'flag', reason: 'c' },
    ]);
    expect(r.result).toBe('block');
    expect(r.reason).toBe('b');
  });
  it('flag wins over pass', () => {
    const r = mostSevere([
      { result: 'pass', reason: 'a' },
      { result: 'flag', reason: 'c' },
    ]);
    expect(r.result).toBe('flag');
  });
  it('returns pass when all findings pass', () => {
    expect(
      mostSevere([
        { result: 'pass', reason: 'a' },
        { result: 'pass', reason: 'b' },
      ]).result,
    ).toBe('pass');
  });
});
