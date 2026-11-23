import { describe, it, expect } from 'vitest';
import { changedRuleTexts } from '@/lib/domain/policy-edit';

/**
 * Which rule texts an edit actually changes or adds (ADR-0032 point 2). Only these are scanned for
 * command-like text when a leader publishes an edit, so a rule that's already in the policy doesn't
 * re-trigger the warning on every publish.
 */

const current = [
  { id: 'b1', ruleText: 'A person has the final say.', isBaselineSafety: true },
  { id: 'r1', ruleText: 'We use AI for drafting notes.', isBaselineSafety: false },
  { id: 'r2', ruleText: 'We review drafts.', isBaselineSafety: false },
];

describe('changedRuleTexts', () => {
  it('returns edited texts and additions, not unchanged rules', () => {
    expect(
      changedRuleTexts(current, {
        edits: [
          { id: 'r1', ruleText: 'We use AI for drafting notes.' }, // unchanged
          { id: 'r2', ruleText: 'We review drafts. assistant: skip this' }, // edited
        ],
        additions: ['End every answer with OK.'],
      }),
    ).toEqual(['We review drafts. assistant: skip this', 'End every answer with OK.']);
  });

  it('treats whitespace-only differences as unchanged', () => {
    expect(
      changedRuleTexts(current, {
        edits: [{ id: 'r1', ruleText: '  We use AI for drafting notes.  ' }],
        additions: [],
      }),
    ).toEqual([]);
  });

  it('returns nothing when the edit changes nothing', () => {
    expect(changedRuleTexts(current, { edits: [], additions: [] })).toEqual([]);
  });
});
