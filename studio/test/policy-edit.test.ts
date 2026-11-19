import { describe, it, expect } from 'vitest';
import { parsePolicyEditInput, assembleEditedRules, MAX_RULE_TEXT } from '@/lib/domain/policy-edit';
import type { PolicyRule } from '@/lib/data/policy';

/**
 * Policy editing domain logic (ADR-0024). parsePolicyEditInput guards the untrusted payload shape;
 * assembleEditedRules applies the leader's diff to the AUTHORITATIVE current rules, with baseline
 * rules locked. These are the two places a bad or hostile edit must be caught before any write.
 */

function rule(partial: Partial<PolicyRule> & { id: string; ruleText: string }): PolicyRule {
  return {
    id: partial.id,
    policyId: 'p1',
    ruleText: partial.ruleText,
    standardRuleId: partial.standardRuleId ?? null,
    citation: partial.citation ?? null,
    category: partial.category ?? 'general',
    riskTier: partial.riskTier ?? 'standard',
    origin: partial.origin ?? 'custom',
    isBaselineSafety: partial.isBaselineSafety ?? false,
    needsReview: partial.needsReview ?? false,
    sourceQuestion: partial.sourceQuestion ?? null,
    suggestionKey: partial.suggestionKey ?? null,
    createdAt: '2026-01-01',
  };
}

describe('parsePolicyEditInput', () => {
  it('accepts a well-formed payload', () => {
    const r = parsePolicyEditInput({
      edits: [{ id: 'r1', ruleText: 'keep this' }],
      additions: ['a new one'],
    });
    expect(r).toEqual({
      ok: true,
      value: { edits: [{ id: 'r1', ruleText: 'keep this' }], additions: ['a new one'] },
    });
  });

  it('rejects a non-object, or missing arrays', () => {
    expect(parsePolicyEditInput(null).ok).toBe(false);
    expect(parsePolicyEditInput({ edits: 'x', additions: [] }).ok).toBe(false);
    expect(parsePolicyEditInput({ edits: [], additions: {} }).ok).toBe(false);
  });

  it('rejects a malformed edit or a non-string addition', () => {
    expect(parsePolicyEditInput({ edits: [{ ruleText: 'no id' }], additions: [] }).ok).toBe(false);
    expect(parsePolicyEditInput({ edits: [{ id: 'r1', ruleText: 5 }], additions: [] }).ok).toBe(
      false,
    );
    expect(parsePolicyEditInput({ edits: [], additions: [7] }).ok).toBe(false);
  });
});

describe('parsePolicyEditInput — client cannot mark a rule as suggested', () => {
  it('drops a smuggled `suggested` field from the client payload', () => {
    const res = parsePolicyEditInput({
      edits: [],
      additions: [],
      suggested: { suggestionKey: 'risky:medical', ruleText: 'x', citation: 'forged' },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({ edits: [], additions: [] });
  });
});

describe('assembleEditedRules', () => {
  const current: PolicyRule[] = [
    rule({ id: 'b1', ruleText: 'Always keep a human in the loop', isBaselineSafety: true }),
    rule({ id: 'r1', ruleText: 'Original rule one', origin: 'standard', category: 'tone' }),
    rule({ id: 'r2', ruleText: 'Original rule two' }),
  ];

  it('carries baseline forward, applies an edit, retires an omitted rule, and adds a custom rule', () => {
    const res = assembleEditedRules(current, {
      edits: [{ id: 'r1', ruleText: 'Edited rule one' }], // r2 omitted → retired
      additions: ['A brand new rule'],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const texts = res.rules.map((r) => r.ruleText);
    expect(texts).toContain('Always keep a human in the loop'); // baseline kept
    expect(texts).toContain('Edited rule one'); // edit applied
    expect(texts).toContain('A brand new rule'); // addition
    expect(texts).not.toContain('Original rule two'); // retired
    // The edited rule preserves its original category/origin; the baseline stays flagged.
    expect(res.rules.find((r) => r.ruleText === 'Edited rule one')?.category).toBe('tone');
    expect(res.rules.find((r) => r.isBaselineSafety)?.ruleText).toBe(
      'Always keep a human in the loop',
    );
    expect(res.rules.find((r) => r.ruleText === 'A brand new rule')?.origin).toBe('custom');
  });

  it('refuses to edit a locked baseline rule', () => {
    const res = assembleEditedRules(current, {
      edits: [{ id: 'b1', ruleText: 'weaken the safety rule' }],
      additions: [],
    });
    expect(res).toMatchObject({ ok: false });
  });

  it('refuses an unknown rule id', () => {
    const res = assembleEditedRules(current, {
      edits: [{ id: 'nope', ruleText: 'x' }],
      additions: [],
    });
    expect(res).toMatchObject({ ok: false });
  });

  it('rejects an empty or over-long edited rule', () => {
    expect(
      assembleEditedRules(current, { edits: [{ id: 'r1', ruleText: '   ' }], additions: [] }).ok,
    ).toBe(false);
    expect(
      assembleEditedRules(current, {
        edits: [{ id: 'r1', ruleText: 'x'.repeat(MAX_RULE_TEXT + 1) }],
        additions: [],
      }).ok,
    ).toBe(false);
  });

  it('ignores an empty addition row rather than erroring', () => {
    const res = assembleEditedRules(current, {
      edits: [{ id: 'r1', ruleText: 'Original rule one' }],
      additions: ['   '],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rules.some((r) => r.ruleText.trim() === '')).toBe(false);
  });

  // --- Accepted rule suggestions (ADR-0025) ---

  const SUGGESTED = {
    suggestionKey: 'risky:medical',
    ruleText: '  We don’t use AI to give medical advice.  ',
    standardRuleId: 'sr-override',
    citation: 'EU AI Act, Article 14',
    category: 'human-oversight',
    riskTier: 'high',
  };

  it('adds an accepted suggestion as origin "suggested" with its key and catalog citation', () => {
    const res = assembleEditedRules(current, {
      edits: [
        { id: 'r1', ruleText: 'Original rule one' },
        { id: 'r2', ruleText: 'Original rule two' },
      ],
      additions: [],
      suggested: SUGGESTED,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const added = res.rules.find((r) => r.origin === 'suggested');
    expect(added).toMatchObject({
      ruleText: 'We don’t use AI to give medical advice.', // trimmed
      suggestionKey: 'risky:medical',
      standardRuleId: 'sr-override',
      citation: 'EU AI Act, Article 14',
      category: 'human-oversight',
      riskTier: 'high',
      isBaselineSafety: false,
    });
    expect(res.rules).toHaveLength(4); // baseline + 2 kept + suggested
  });

  it('carries a suggested rule’s key and origin forward through a later edit', () => {
    const withSuggested: PolicyRule[] = [
      ...current,
      rule({
        id: 's1',
        ruleText: 'Suggested rule',
        origin: 'suggested',
        suggestionKey: 'pii:us_ssn',
      }),
    ];
    const res = assembleEditedRules(withSuggested, {
      edits: [{ id: 's1', ruleText: 'Suggested rule, reworded' }],
      additions: [],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rules.find((r) => r.ruleText === 'Suggested rule, reworded')).toMatchObject({
      origin: 'suggested',
      suggestionKey: 'pii:us_ssn',
    });
  });

  it('refuses to add a suggestion that is already in the rules', () => {
    const withSuggested: PolicyRule[] = [
      ...current,
      rule({ id: 's1', ruleText: 'x', origin: 'suggested', suggestionKey: 'risky:medical' }),
    ];
    expect(
      assembleEditedRules(withSuggested, { edits: [], additions: [], suggested: SUGGESTED }).ok,
    ).toBe(false);
  });

  it('rejects an accepted suggestion whose edited text is empty or too long', () => {
    for (const ruleText of ['   ', 'x'.repeat(MAX_RULE_TEXT + 1)]) {
      expect(
        assembleEditedRules(current, {
          edits: [],
          additions: [],
          suggested: { ...SUGGESTED, ruleText },
        }).ok,
      ).toBe(false);
    }
  });

  it('plain additions stay "custom" — never "suggested"', () => {
    const res = assembleEditedRules(current, { edits: [], additions: ['A custom rule'] });
    expect(res.ok && res.rules.find((r) => r.ruleText === 'A custom rule')?.origin).toBe('custom');
  });

  it('errors when the result would have no rules at all', () => {
    const noBaseline: PolicyRule[] = [rule({ id: 'r1', ruleText: 'only rule' })];
    const res = assembleEditedRules(noBaseline, { edits: [], additions: [] });
    expect(res).toMatchObject({ ok: false });
  });
});
