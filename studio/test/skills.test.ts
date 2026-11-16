import { describe, it, expect } from 'vitest';
import { getSkillDef, SKILL_DEFS } from '@/lib/domain/skills';

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
