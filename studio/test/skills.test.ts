import { describe, it, expect } from 'vitest';
import { getSkillDef, SKILL_DEFS, applicableRules } from '@/lib/domain/skills';

describe('skills registry', () => {
  it('returns the definition for a known Skill key', () => {
    const def = getSkillDef('draft_thank_you');
    expect(def).not.toBeNull();
    expect(def?.key).toBe('draft_thank_you');
    expect(def?.basePrompt.length).toBeGreaterThan(0);
  });

  it('carries the tone quality bar for the thank-you Skill (ADR-0015)', () => {
    expect(getSkillDef('draft_thank_you')?.critiqueCriteria).toMatch(/warm/i);
  });

  it('returns null for an unknown key (so the pipeline/action can reject it)', () => {
    expect(getSkillDef('definitely_not_a_skill')).toBeNull();
    expect(getSkillDef('')).toBeNull();
  });

  it('keys match their map entry (no copy-paste drift)', () => {
    for (const [key, def] of Object.entries(SKILL_DEFS)) {
      expect(def.key).toBe(key);
    }
  });
});

describe('applicableRules (in-context guidance filter)', () => {
  const rules = [
    { ruleText: 'Minimize personal information.', category: 'data-protection', citation: 'NIST' },
    { ruleText: 'A person has the final say.', category: 'human-oversight', citation: null },
    { ruleText: 'Label AI-assisted output.', category: 'transparency-provenance', citation: 'EU' },
    { ruleText: 'Log every AI use.', category: 'accountability-logging', citation: null },
    { ruleText: 'Tier risky uses.', category: 'risk-tiering', citation: null },
  ];

  it("returns only rules in the thank-you Skill's relevant categories", () => {
    const got = applicableRules('draft_thank_you', rules);
    expect(got.map((r) => r.category)).toEqual([
      'data-protection',
      'human-oversight',
      'transparency-provenance',
    ]);
  });

  it('does not overwhelm — excludes unrelated categories (logging, risk-tiering)', () => {
    const cats = applicableRules('draft_thank_you', rules).map((r) => r.category);
    expect(cats).not.toContain('accountability-logging');
    expect(cats).not.toContain('risk-tiering');
  });

  it('preserves citations on the surfaced rules', () => {
    const dp = applicableRules('draft_thank_you', rules).find(
      (r) => r.category === 'data-protection',
    );
    expect(dp?.citation).toBe('NIST');
  });

  it('returns [] for an unknown Skill and for no rules', () => {
    expect(applicableRules('nope', rules)).toEqual([]);
    expect(applicableRules('draft_thank_you', [])).toEqual([]);
  });
});
