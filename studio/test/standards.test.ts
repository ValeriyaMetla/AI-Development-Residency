import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase server client so the data-source accessor can be tested without a
// live database. Each query builder method returns the builder; the terminal .order()
// resolves to { data, error }.
const mockResult = vi.fn();

vi.mock('@/lib/data/supabase/server', () => {
  const builder = {
    from: () => builder,
    select: () => builder,
    eq: () => builder,
    order: () => mockResult(),
  };
  return { createClient: () => Promise.resolve({ from: () => builder }) };
});

import {
  mapStandardRuleRow,
  getStandardRulesByCategory,
  getAllStandardRules,
} from '@/lib/data/standards';

const row = {
  code: 'nist-human-oversight',
  rule_text: 'A named person is accountable for each AI use.',
  category: 'human-oversight',
  risk_tier: 'all',
  citation: 'NIST AI RMF (2023), GOVERN function',
};

beforeEach(() => {
  mockResult.mockReset();
});

describe('mapStandardRuleRow', () => {
  it('maps snake_case columns to camelCase fields', () => {
    expect(mapStandardRuleRow(row)).toEqual({
      code: 'nist-human-oversight',
      ruleText: 'A named person is accountable for each AI use.',
      category: 'human-oversight',
      riskTier: 'all',
      citation: 'NIST AI RMF (2023), GOVERN function',
    });
  });
});

describe('getStandardRulesByCategory', () => {
  it('returns mapped rules on success', async () => {
    mockResult.mockResolvedValue({ data: [row], error: null });
    const rules = await getStandardRulesByCategory('human-oversight');
    expect(rules).toEqual([
      {
        code: 'nist-human-oversight',
        ruleText: 'A named person is accountable for each AI use.',
        category: 'human-oversight',
        riskTier: 'all',
        citation: 'NIST AI RMF (2023), GOVERN function',
      },
    ]);
  });

  it('returns [] on error (graceful degradation)', async () => {
    mockResult.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getStandardRulesByCategory('human-oversight')).toEqual([]);
  });
});

describe('getAllStandardRules', () => {
  it('returns [] when the query errors', async () => {
    mockResult.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getAllStandardRules()).toEqual([]);
  });
});
