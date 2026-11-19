import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Rule-suggestion orchestration (ADR-0025). Only the data edges are mocked; detection, the catalog,
 * and dedup run for real. Proves the end-to-end read path and that every read failure fails CLOSED
 * (`unavailable`) instead of returning a partial list that could re-surface a dismissal.
 */

vi.mock('@/lib/data/suggestions', () => ({
  getSuggestionSignalsSince: vi.fn(),
  getSuggestionDecisionKeys: vi.fn(),
}));
vi.mock('@/lib/data/policy', () => ({ getActivePolicy: vi.fn(), getPolicyRules: vi.fn() }));
vi.mock('@/lib/data/standards', () => ({ getAllStandardRules: vi.fn() }));

import { getSuggestionSignalsSince, getSuggestionDecisionKeys } from '@/lib/data/suggestions';
import type { SignalEvent } from '@/lib/data/suggestions';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { getAllStandardRules } from '@/lib/data/standards';
import { getRuleSuggestions } from '@/lib/domain/rule-suggestion-service';

const NOW = new Date('2026-11-18T12:00:00.000Z');
const recent = '2026-11-15T12:00:00.000Z';

const medicalRuns: SignalEvent[] = ['r1', 'r2', 'r3'].map((r) => ({
  taskRunId: r,
  eventType: 'risky_use_flagged',
  payload: { patterns: ['medical'] },
  createdAt: recent,
}));
const ssnRuns: SignalEvent[] = ['r4', 'r5', 'r6'].map((r) => ({
  taskRunId: r,
  eventType: 'pii_stripped',
  payload: { categories: ['us_ssn'] },
  createdAt: recent,
}));

const STANDARDS = [
  {
    id: 'sr-override',
    code: 'euaiact-human-override',
    ruleText: 'For higher-risk uses, a person must be able to review, override, or stop the AI.',
    category: 'human-oversight',
    riskTier: 'high',
    citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
  },
  {
    id: 'sr-data',
    code: 'iso42001-data-governance',
    ruleText: 'Govern the data you put into AI.',
    category: 'data-protection',
    riskTier: 'sensitive',
    citation: 'ISO/IEC 42001:2023, Annex A (data governance controls)',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSuggestionSignalsSince).mockResolvedValue([...medicalRuns, ...ssnRuns]);
  vi.mocked(getSuggestionDecisionKeys).mockResolvedValue(new Set());
  vi.mocked(getActivePolicy).mockResolvedValue({ id: 'policy1' } as never);
  vi.mocked(getPolicyRules).mockResolvedValue([]);
  vi.mocked(getAllStandardRules).mockResolvedValue(STANDARDS);
});

describe('getRuleSuggestions — happy path', () => {
  it('surfaces each recurring, uncovered pattern with its cited rule', async () => {
    const res = await getRuleSuggestions('org1', NOW);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.suggestions.map((s) => [s.key, s.standardRuleId])).toEqual([
      ['pii:us_ssn', 'sr-data'],
      ['risky:medical', 'sr-override'],
    ]);
  });

  it('reads the registry from the start of the 30-day window', async () => {
    await getRuleSuggestions('org1', NOW);
    expect(vi.mocked(getSuggestionSignalsSince)).toHaveBeenCalledWith('2026-10-19T12:00:00.000Z');
  });

  it('drops a pattern the leader already decided on', async () => {
    vi.mocked(getSuggestionDecisionKeys).mockResolvedValue(new Set(['risky:medical']));
    const res = await getRuleSuggestions('org1', NOW);
    expect(res.status === 'ok' && res.suggestions.map((s) => s.key)).toEqual(['pii:us_ssn']);
  });

  it('drops a pattern already accepted into the active policy, even with no decision row', async () => {
    vi.mocked(getPolicyRules).mockResolvedValue([{ suggestionKey: 'pii:us_ssn' }] as never);
    const res = await getRuleSuggestions('org1', NOW);
    expect(res.status === 'ok' && res.suggestions.map((s) => s.key)).toEqual(['risky:medical']);
  });

  it('with no active policy, still suggests (and does not read rules)', async () => {
    vi.mocked(getActivePolicy).mockResolvedValue(null);
    const res = await getRuleSuggestions('org1', NOW);
    expect(res.status === 'ok' && res.suggestions).toHaveLength(2);
    expect(vi.mocked(getPolicyRules)).not.toHaveBeenCalled();
  });

  it('returns ok with no suggestions, and skips further reads, when nothing recurs', async () => {
    vi.mocked(getSuggestionSignalsSince).mockResolvedValue(medicalRuns.slice(0, 2));
    const res = await getRuleSuggestions('org1', NOW);
    expect(res).toEqual({ status: 'ok', suggestions: [] });
    expect(vi.mocked(getSuggestionDecisionKeys)).not.toHaveBeenCalled();
    expect(vi.mocked(getAllStandardRules)).not.toHaveBeenCalled();
  });
});

describe('getRuleSuggestions — fails closed', () => {
  it('is unavailable when the registry cannot be read', async () => {
    vi.mocked(getSuggestionSignalsSince).mockResolvedValue(null);
    expect((await getRuleSuggestions('org1', NOW)).status).toBe('unavailable');
  });

  it('is unavailable (not a partial list) when the decision memory cannot be read', async () => {
    vi.mocked(getSuggestionDecisionKeys).mockResolvedValue(null);
    expect((await getRuleSuggestions('org1', NOW)).status).toBe('unavailable');
  });

  it('is unavailable when the standards catalog cannot be read (nothing can be cited)', async () => {
    vi.mocked(getAllStandardRules).mockResolvedValue([]);
    expect((await getRuleSuggestions('org1', NOW)).status).toBe('unavailable');
  });
});
