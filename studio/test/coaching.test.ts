import { describe, it, expect } from 'vitest';
import { coachingFor } from '@/lib/domain/coaching';
import { detectRiskyUse } from '@/lib/domain/risky-use';

/**
 * In-the-moment coaching (Epic 6). coachingFor turns a detected risk pattern into a guide-not-scold
 * nudge with a safer way. The load-bearing guarantee: "use the safer way" must land on a task that
 * doesn't itself trip a risk pattern — otherwise the coach would walk the Doer into the same wall.
 */

// One input per pattern that trips it (mirrors risky-use.ts's RISK_PATTERNS).
const TRIGGERS: Record<string, string> = {
  'decision-about-person': 'whether to fire this volunteer',
  'ranking-people': 'rank these candidates for me',
  medical: 'diagnose this patient',
  legal: 'give me legal advice',
  'benefits-housing': 'we are evicting this tenant',
  'safety-crisis': 'he mentioned suicide',
};

describe('coachingFor', () => {
  it('returns no nudge for a routine task', () => {
    expect(coachingFor('Draft a warm thank-you to Maria for her monthly gift')).toEqual([]);
  });

  it('coaches each risk pattern with a plain-language message', () => {
    for (const [id, input] of Object.entries(TRIGGERS)) {
      const nudge = coachingFor(input).find((n) => n.id === id);
      expect(nudge).toBeTruthy();
      expect((nudge?.message.length ?? 0) > 0).toBe(true);
    }
  });

  it('a safety/crisis nudge offers no AI rewrite — it points to a person', () => {
    const nudge = coachingFor(TRIGGERS['safety-crisis']).find((n) => n.id === 'safety-crisis');
    expect(nudge?.saferRewrite).toBeNull();
  });

  it("applying the safer way lands on a task that doesn't re-trip any risk pattern", () => {
    for (const [id, input] of Object.entries(TRIGGERS)) {
      const nudge = coachingFor(input).find((n) => n.id === id);
      if (nudge?.saferRewrite) {
        // The rewritten task must be clean — zero risk patterns — so accepting it is genuinely safe.
        expect(detectRiskyUse(nudge.saferRewrite)).toEqual([]);
      }
    }
  });
});
