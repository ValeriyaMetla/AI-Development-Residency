import { describe, expect, it } from 'vitest';
import { missingNoneApplyConfirmation, SIGNAL_DEFS } from '@/lib/domain/copilot';
import { COPILOT_QUESTIONS } from '@/app/(app)/copilot/copilot-questions';

describe('Co-Pilot questions — one plain-language explanation per risk signal', () => {
  it('asks exactly one question per risk signal the engine reads', () => {
    const asked = COPILOT_QUESTIONS.map((q) => q.key).sort();
    expect(asked).toEqual(Object.keys(SIGNAL_DEFS).sort());
  });

  it('every question has a non-empty explanation underneath', () => {
    for (const q of COPILOT_QUESTIONS) {
      expect(q.hint.trim(), `question "${q.key}" has no explanation`).not.toBe('');
    }
  });

  it('explains the terms a non-expert is most likely not to know', () => {
    const banned = COPILOT_QUESTIONS.find((q) => q.key === 'bannedPurpose');
    expect(banned?.hint).toMatch(/social scoring means/i);
    expect(banned?.hint).toMatch(/surveillance means/i);
  });
});

describe('"None of these apply" — a blank form is never read as safe', () => {
  it('nothing ticked and no confirmation → confirmation is missing', () => {
    expect(missingNoneApplyConfirmation({}, undefined)).toBe(true);
    expect(missingNoneApplyConfirmation({ judgesPerson: false }, false)).toBe(true);
  });

  it('nothing ticked but confirmed → allowed', () => {
    expect(missingNoneApplyConfirmation({}, true)).toBe(false);
  });

  it('any risk box ticked → no confirmation needed', () => {
    expect(missingNoneApplyConfirmation({ sensitiveData: true }, undefined)).toBe(false);
  });

  it('only a literal true counts (untrusted input)', () => {
    expect(missingNoneApplyConfirmation({}, 'true')).toBe(true);
    expect(missingNoneApplyConfirmation({}, 1)).toBe(true);
  });

  it('ignores keys that are not real risk signals', () => {
    expect(
      missingNoneApplyConfirmation({ notASignal: true } as Record<string, boolean>, undefined),
    ).toBe(true);
  });
});
