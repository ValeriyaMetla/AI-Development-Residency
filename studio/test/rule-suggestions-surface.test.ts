import { describe, it, expect } from 'vitest';
import {
  surfaceSuggestions,
  suggestionEvidenceLabel,
  SUGGESTION_CATALOG,
  type CoverageContext,
  type PatternCandidate,
} from '@/lib/domain/rule-suggestions';
import type { StandardsByCode } from '@/lib/domain/policy-generator';

/**
 * Surface candidate rule suggestions (dedup) (Epic 2 · Rule suggestions · Chunk 4; ADR-0025).
 * Card AC: Given a pattern already covered by an existing rule, When suggestions are generated,
 * Then no duplicate candidate is surfaced. Pure tests — no I/O.
 */

const STANDARDS: StandardsByCode = new Map([
  [
    'euaiact-human-override',
    {
      id: 'sr-override',
      citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
      ruleText: 'For higher-risk uses, a person must be able to review, override, or stop the AI.',
      category: 'human-oversight',
      riskTier: 'high',
    },
  ],
  [
    'iso42001-data-governance',
    {
      id: 'sr-data',
      citation: 'ISO/IEC 42001:2023, Annex A (data governance controls)',
      ruleText: 'Govern the data you put into AI.',
      category: 'data-protection',
      riskTier: 'sensitive',
    },
  ],
]);

const none = new Set<string>();
const ctx = (over: Partial<CoverageContext> = {}): CoverageContext => ({
  decidedKeys: none,
  activeRuleKeys: none,
  standardsByCode: STANDARDS,
  ...over,
});
const cand = (key: string, count = 3): PatternCandidate => ({ key, count, windowDays: 30 });

describe('surfaceSuggestions — the card AC (no duplicate of a covered pattern)', () => {
  it('does not surface a pattern the active policy already has a rule for', () => {
    const res = surfaceSuggestions(
      [cand('risky:medical')],
      ctx({ activeRuleKeys: new Set(['risky:medical']) }),
    );
    expect(res).toEqual([]);
  });

  it('does not surface a pattern the leader already accepted or dismissed', () => {
    const res = surfaceSuggestions(
      [cand('risky:medical'), cand('pii:us_ssn')],
      ctx({ decidedKeys: new Set(['risky:medical', 'pii:us_ssn']) }),
    );
    expect(res).toEqual([]);
  });

  it('still surfaces the uncovered pattern alongside a covered one', () => {
    const res = surfaceSuggestions(
      [cand('risky:medical', 5), cand('risky:legal', 3)],
      ctx({ decidedKeys: new Set(['risky:medical']) }),
    );
    expect(res.map((s) => s.key)).toEqual(['risky:legal']);
  });
});

describe('surfaceSuggestions — what a surfaced suggestion carries', () => {
  it('uses the catalog wording and a citation resolved from the standards catalog', () => {
    const [s] = surfaceSuggestions([cand('risky:medical', 4)], ctx());
    expect(s).toEqual({
      key: 'risky:medical',
      ruleText: SUGGESTION_CATALOG['risky:medical'].ruleText,
      standardRuleId: 'sr-override',
      citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
      category: 'human-oversight',
      riskTier: 'high',
      count: 4,
      windowDays: 30,
      evidenceLabel: 'Health-related tasks — 4 times in the last 30 days',
    });
  });

  it('inherits category and risk tier from the cited standard (PII → data-protection)', () => {
    const [s] = surfaceSuggestions([cand('pii:us_ssn')], ctx());
    expect([s.category, s.riskTier, s.standardRuleId]).toEqual([
      'data-protection',
      'sensitive',
      'sr-data',
    ]);
  });

  it('keeps the candidates’ order (most frequent first)', () => {
    const res = surfaceSuggestions([cand('pii:us_ssn', 6), cand('risky:legal', 3)], ctx());
    expect(res.map((s) => s.key)).toEqual(['pii:us_ssn', 'risky:legal']);
  });
});

describe('surfaceSuggestions — what is never surfaced', () => {
  it('drops keys deliberately excluded from the catalog', () => {
    const res = surfaceSuggestions(
      [cand('risky:ranking-people'), cand('pii:email'), cand('pii:phone')],
      ctx(),
    );
    expect(res).toEqual([]);
  });

  it('drops unknown keys, including prototype-property names', () => {
    const res = surfaceSuggestions(
      [cand('risky:astrology'), cand('toString'), cand('__proto__'), cand('constructor')],
      ctx(),
    );
    expect(res).toEqual([]);
  });

  it('drops a suggestion whose grounding standard cannot be resolved (never uncited)', () => {
    const res = surfaceSuggestions([cand('risky:medical')], ctx({ standardsByCode: new Map() }));
    expect(res).toEqual([]);
  });
});

describe('catalog integrity', () => {
  it('cites only seeded standard codes and excludes the baseline-covered / routine keys', () => {
    const seeded = new Set([
      'nist-human-oversight',
      'nist-document-use',
      'nist-check-output',
      'euaiact-match-risk',
      'euaiact-human-override',
      'euaiact-disclose-ai',
      'iso42001-data-governance',
      'iso42001-managed-logging',
      'iso42001-records',
    ]);
    for (const entry of Object.values(SUGGESTION_CATALOG)) {
      expect(seeded.has(entry.standardCode)).toBe(true);
      expect(entry.ruleText.trim().length).toBeGreaterThan(0);
      expect(entry.ruleText.length).toBeLessThanOrEqual(500); // MAX_RULE_TEXT
    }
    expect(Object.keys(SUGGESTION_CATALOG)).not.toEqual(
      expect.arrayContaining(['risky:ranking-people']),
    );
    for (const k of ['risky:ranking-people', 'pii:email', 'pii:phone']) {
      expect(Object.hasOwn(SUGGESTION_CATALOG, k)).toBe(false);
    }
  });
});

describe('privacy — evidence is counts only', () => {
  it('a suggestion carries no run ids, user ids, or content fields', () => {
    const [s] = surfaceSuggestions([cand('risky:medical')], ctx());
    expect(Object.keys(s).sort()).toEqual([
      'category',
      'citation',
      'count',
      'evidenceLabel',
      'key',
      'riskTier',
      'ruleText',
      'standardRuleId',
      'windowDays',
    ]);
  });

  it('formats the evidence line from a label, a count, and a window', () => {
    expect(suggestionEvidenceLabel('Legal-related tasks', 3, 30)).toBe(
      'Legal-related tasks — 3 times in the last 30 days',
    );
  });
});
