import { describe, it, expect } from 'vitest';
import { validatePolicySeedAnswers } from '@/lib/domain/policy-seed-spec';

const valid = {
  accountablePerson: { name: '  Jane Doe  ', role: '  Executive Director ' },
  purposes: [' Drafting communications ', ''],
  handlesSensitiveData: 'yes',
  higherStakes: 'not_sure',
  externalContent: 'no',
  reviewer: 'Ops Manager',
  customProhibitedUses: ['No resume screening'],
};

describe('validatePolicySeedAnswers — accepts + normalizes', () => {
  it('trims strings, drops blank purposes, and returns normalized answers', () => {
    const res = validatePolicySeedAnswers(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.answers.accountablePerson).toEqual({
        name: 'Jane Doe',
        role: 'Executive Director',
      });
      expect(res.answers.purposes).toEqual(['Drafting communications']);
      expect(res.answers.higherStakes).toBe('not_sure');
    }
  });

  it('accepts a minimal answer set (optional fields omitted)', () => {
    const res = validatePolicySeedAnswers({
      accountablePerson: { name: 'A', role: 'B' },
      purposes: ['X'],
      handlesSensitiveData: 'no',
      higherStakes: 'no',
    });
    expect(res.ok).toBe(true);
  });
});

describe('validatePolicySeedAnswers — rejects bad input', () => {
  it('rejects a non-object', () => {
    expect(validatePolicySeedAnswers(null).ok).toBe(false);
    expect(validatePolicySeedAnswers('nope').ok).toBe(false);
  });

  it('rejects a missing or empty accountable person (Q1)', () => {
    expect(validatePolicySeedAnswers({ ...valid, accountablePerson: undefined }).ok).toBe(false);
    expect(
      validatePolicySeedAnswers({ ...valid, accountablePerson: { name: ' ', role: 'x' } }).ok,
    ).toBe(false);
  });

  it('rejects empty or non-string purposes (Q2)', () => {
    expect(validatePolicySeedAnswers({ ...valid, purposes: [] }).ok).toBe(false);
    expect(validatePolicySeedAnswers({ ...valid, purposes: [1, 2] }).ok).toBe(false);
  });

  it('rejects invalid tri-state answers (Q3/Q4)', () => {
    expect(validatePolicySeedAnswers({ ...valid, handlesSensitiveData: 'maybe' }).ok).toBe(false);
    expect(validatePolicySeedAnswers({ ...valid, higherStakes: undefined }).ok).toBe(false);
  });

  it('rejects malformed optional fields (Q5/Q6/Q7)', () => {
    expect(validatePolicySeedAnswers({ ...valid, externalContent: 'huh' }).ok).toBe(false);
    expect(validatePolicySeedAnswers({ ...valid, reviewer: 42 }).ok).toBe(false);
    expect(validatePolicySeedAnswers({ ...valid, customProhibitedUses: [1] }).ok).toBe(false);
  });
});

// Real-data fixes (2026-11-19): a dev-org policy showed a clause that read just "none" and a review
// rule that read "myself reviews…". Free-text answers are now normalized at the Service boundary.
describe('validatePolicySeedAnswers — filler limits and "myself" reviewer', () => {
  it('drops filler custom limits ("none", "N/A.", "nothing else") but keeps real ones', () => {
    const res = validatePolicySeedAnswers({
      ...valid,
      customProhibitedUses: ['none', ' N/A. ', 'Nothing else', 'No resume screening'],
    });
    expect(res.ok && res.answers.customProhibitedUses).toEqual(['No resume screening']);
  });

  it('leaves no custom limits at all when every entry is filler', () => {
    const res = validatePolicySeedAnswers({ ...valid, customProhibitedUses: ['none'] });
    expect(res.ok && res.answers.customProhibitedUses).toBeUndefined();
  });

  it('never drops a real limit that merely starts with a filler word', () => {
    const res = validatePolicySeedAnswers({
      ...valid,
      customProhibitedUses: ['No AI for hiring decisions', 'None of our client files go into AI'],
    });
    expect(res.ok && res.answers.customProhibitedUses).toEqual([
      'No AI for hiring decisions',
      'None of our client files go into AI',
    ]);
  });

  it('treats a "me"/"myself" reviewer as the accountable person (falls back to Q1)', () => {
    for (const reviewer of ['myself', 'Me', ' myself. ', 'same person']) {
      const res = validatePolicySeedAnswers({ ...valid, reviewer });
      expect(res.ok && res.answers.reviewer).toBeUndefined();
    }
  });

  it('keeps a named reviewer, trimmed', () => {
    const res = validatePolicySeedAnswers({ ...valid, reviewer: '  Ops Manager ' });
    expect(res.ok && res.answers.reviewer).toBe('Ops Manager');
  });
});
