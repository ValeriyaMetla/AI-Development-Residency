import { describe, expect, it } from 'vitest';
import { AUDIT_EVENT_TYPES } from '@/lib/domain/audit-events';
import { ruleCheck } from '@/lib/domain/guardrails';
import { detectPii } from '@/lib/domain/pii';
import { AI_PROVENANCE } from '@/lib/domain/provenance';
import {
  SAMPLE_PRESETS,
  SAMPLE_RULES,
  SAMPLE_SKILL_NAME,
  SAMPLE_TRAIL,
} from '@/lib/demo/sample-org';

// ADR-0029 T2: the demo's sample data must agree with the REAL safety code, so the demo can't
// claim something the product doesn't do, and must hold only obviously fake personal data.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_DIGITS = /\(?\d{3}\)?[-.\s]*\d{3}[-.\s]\d{4}/g;

/** Every text in the sample file a visitor could see. */
const allTexts = SAMPLE_PRESETS.flatMap((p) => [p.label, p.request, p.preparedDraft]).concat(
  SAMPLE_RULES.map((r) => r.ruleText),
);

function piiCategories(text: string): string[] {
  return detectPii(text)
    .map((f) => f.category)
    .sort();
}

describe('demo sample org (ADR-0029)', () => {
  it('uses only known audit event kinds', () => {
    for (const e of SAMPLE_TRAIL) expect(AUDIT_EVENT_TYPES).toContain(e.type);
  });

  it('holds only obviously fake personal data', () => {
    for (const text of allTexts) {
      for (const email of text.match(EMAIL) ?? []) expect(email).toMatch(/@example\.com$/);
      for (const phone of text.match(PHONE_DIGITS) ?? [])
        expect(phone.replace(/\D/g, '')).toMatch(/^555555/);
      expect(detectPii(text).map((f) => f.category)).not.toContain('us_ssn');
      expect(detectPii(text).map((f) => f.category)).not.toContain('credit_card');
    }
  });

  it('records the same stripped categories the real detectPii finds in each request', () => {
    for (const preset of SAMPLE_PRESETS) {
      const stripped = SAMPLE_TRAIL.filter(
        (e) => e.taskRunId === preset.taskRunId && e.type === 'pii_stripped',
      );
      expect(stripped).toHaveLength(1);
      expect([...(stripped[0].detail.categories ?? [])].sort()).toEqual(
        piiCategories(preset.request),
      );
    }
  });

  it('flags only the partner draft under the real rule-check, matching the trail outcome', () => {
    for (const preset of SAMPLE_PRESETS) {
      const check = ruleCheck(preset.preparedDraft, SAMPLE_RULES);
      const finished = SAMPLE_TRAIL.find(
        (e) => e.taskRunId === preset.taskRunId && e.type === 'task_completed',
      );
      const expected = preset.id === 'partner' ? 'flag' : 'pass';
      expect(check.result).toBe(expected);
      expect(finished?.detail.outcome).toBe(expected === 'flag' ? 'needs_review' : 'completed');
    }
  });

  it('has exactly one run waiting for review', () => {
    const waiting = SAMPLE_TRAIL.filter((e) => e.detail.outcome === 'needs_review');
    expect(waiting).toHaveLength(1);
  });

  it('has a data-protection rule, which the contact-detail check needs', () => {
    expect(SAMPLE_RULES.some((r) => r.category === 'data-protection')).toBe(true);
  });

  it('never shows the real AI provenance label anywhere in the sample data', () => {
    for (const text of allTexts) expect(text).not.toContain(AI_PROVENANCE);
  });

  // Rule texts are exempt: the real catalog rule "label AI-generated content" names AI on purpose.
  it('no sample request or prepared draft claims a model produced it', () => {
    for (const preset of SAMPLE_PRESETS) {
      for (const text of [preset.label, preset.request, preset.preparedDraft])
        expect(text).not.toMatch(/claude|sonnet|ai-generated/i);
    }
  });

  it("shows only the product's real Skill", () => {
    expect(SAMPLE_SKILL_NAME).toBe('Draft a thank-you note');
  });

  it('lists the trail oldest first', () => {
    const times = SAMPLE_TRAIL.map((e) => e.at);
    expect([...times].sort()).toEqual(times);
  });
});
