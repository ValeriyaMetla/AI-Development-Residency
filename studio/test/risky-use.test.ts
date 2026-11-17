import { describe, it, expect } from 'vitest';
import { detectRiskyUse, riskyUseFinding } from '@/lib/domain/risky-use';

const ids = (text: string) => detectRiskyUse(text).map((f) => f.id);

describe('detectRiskyUse — flags genuine risk patterns', () => {
  it('a decision about a specific person', () => {
    expect(ids('Help me decide whether to hire James')).toContain('decision-about-person');
    expect(ids('who should get the scholarship this year')).toContain('decision-about-person');
  });
  it('ranking or scoring people', () => {
    expect(ids('rank the candidates by their interviews')).toContain('ranking-people');
  });
  it('high-stakes domains (medical, legal, benefits, safety)', () => {
    expect(ids('write up a diagnosis for the patient')).toContain('medical');
    expect(ids('we need legal advice about this')).toContain('legal');
    expect(ids('help with an eviction notice')).toContain('benefits-housing');
    expect(ids('a client mentioned suicide')).toContain('safety-crisis');
  });
  it('riskyUseFinding returns flag with a plain, human-review reason', () => {
    const f = riskyUseFinding('decide whether to fire this volunteer');
    expect(f.result).toBe('flag');
    expect(f.reason).toMatch(/person should review/i);
  });
});

describe('Tune flagging — routine, safe tasks are NOT flagged (low false-positives)', () => {
  const routine = [
    'Maria, for her $50 monthly gift and volunteering at our food drive',
    'Thank the board for approving our annual budget',
    'Promote our spring fundraiser on social media',
    'Reminder about the monthly fire drill on Friday',
    'Draft a note rating our new logo as a hit with donors',
    'Thank James for 10 years of steady support',
    'A warm note to our volunteers after the gala',
  ];

  it('flags zero risk patterns across a sample of ordinary nonprofit tasks', () => {
    const flagged = routine.filter((t) => detectRiskyUse(t).length > 0);
    expect(flagged).toEqual([]);
  });

  it('a plain thank-you passes', () => {
    expect(riskyUseFinding('Thank Maria for her generous monthly gift').result).toBe('pass');
  });
});
