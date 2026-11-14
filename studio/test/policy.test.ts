import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase server client so the policy accessor can be tested without a live
// database. Every query-builder method returns the builder, and the builder is thenable:
// awaiting any chain resolves to whatever mockResult() returns ({ data, error }).
const mockResult = vi.fn();

vi.mock('@/lib/data/supabase/server', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'eq', 'order', 'maybeSingle', 'single']) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockResult()).then(resolve, reject);
  const client = { from: () => builder };
  return { createClient: () => Promise.resolve(client) };
});

import {
  mapPolicyRow,
  mapPolicyRuleRow,
  mapPolicySeedResponseRow,
  getActivePolicy,
  getPolicyRules,
  createPolicy,
  insertPolicyRules,
  savePolicySeedResponse,
  activatePolicy,
} from '@/lib/data/policy';

const policyRow = {
  id: 'p1',
  org_id: 'org1',
  name: 'Starter policy',
  status: 'active' as const,
  created_at: '2026-11-13T00:00:00Z',
};

const ruleRow = {
  id: 'r1',
  policy_id: 'p1',
  rule_text: 'A named person is accountable for AI use.',
  standard_rule_id: 'sr1',
  citation: 'NIST AI RMF (2023), GOVERN function',
  category: 'human-oversight',
  risk_tier: 'all',
  origin: 'standard' as const,
  is_baseline_safety: true,
  needs_review: false,
  source_question: 'Q1',
  created_at: '2026-11-13T00:00:00Z',
};

const responseRow = {
  id: 'resp1',
  policy_id: 'p1',
  answers: { Q1: 'Jane Doe' },
  created_by: 'user1',
  created_at: '2026-11-13T00:00:00Z',
};

beforeEach(() => {
  mockResult.mockReset();
});

describe('mappers', () => {
  it('mapPolicyRow maps snake_case to camelCase', () => {
    expect(mapPolicyRow(policyRow)).toEqual({
      id: 'p1',
      orgId: 'org1',
      name: 'Starter policy',
      status: 'active',
      createdAt: '2026-11-13T00:00:00Z',
    });
  });

  it('mapPolicyRuleRow maps all fields incl. nullable provenance', () => {
    expect(mapPolicyRuleRow(ruleRow)).toEqual({
      id: 'r1',
      policyId: 'p1',
      ruleText: 'A named person is accountable for AI use.',
      standardRuleId: 'sr1',
      citation: 'NIST AI RMF (2023), GOVERN function',
      category: 'human-oversight',
      riskTier: 'all',
      origin: 'standard',
      isBaselineSafety: true,
      needsReview: false,
      sourceQuestion: 'Q1',
      createdAt: '2026-11-13T00:00:00Z',
    });
  });

  it('mapPolicySeedResponseRow maps fields and keeps answers jsonb', () => {
    expect(mapPolicySeedResponseRow(responseRow)).toEqual({
      id: 'resp1',
      policyId: 'p1',
      answers: { Q1: 'Jane Doe' },
      createdBy: 'user1',
      createdAt: '2026-11-13T00:00:00Z',
    });
  });
});

describe('getActivePolicy', () => {
  it('returns the mapped policy on success', async () => {
    mockResult.mockResolvedValue({ data: policyRow, error: null });
    expect(await getActivePolicy('org1')).toEqual(mapPolicyRow(policyRow));
  });

  it('returns null when none is active', async () => {
    mockResult.mockResolvedValue({ data: null, error: null });
    expect(await getActivePolicy('org1')).toBeNull();
  });

  it('returns null on error (graceful degradation)', async () => {
    mockResult.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getActivePolicy('org1')).toBeNull();
  });
});

describe('getPolicyRules', () => {
  it('returns mapped rules on success', async () => {
    mockResult.mockResolvedValue({ data: [ruleRow], error: null });
    expect(await getPolicyRules('p1')).toEqual([mapPolicyRuleRow(ruleRow)]);
  });

  it('returns [] on error', async () => {
    mockResult.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getPolicyRules('p1')).toEqual([]);
  });
});

describe('createPolicy', () => {
  it('returns the new id on success', async () => {
    mockResult.mockResolvedValue({ data: { id: 'p1' }, error: null });
    expect(await createPolicy({ orgId: 'org1', name: 'Starter' })).toBe('p1');
  });

  it('returns null on error', async () => {
    mockResult.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await createPolicy({ orgId: 'org1', name: 'Starter' })).toBeNull();
  });
});

describe('insertPolicyRules', () => {
  it('returns true for an empty list without touching the DB', async () => {
    expect(await insertPolicyRules('p1', [])).toBe(true);
    expect(mockResult).not.toHaveBeenCalled();
  });

  it('returns true on success', async () => {
    mockResult.mockResolvedValue({ error: null });
    const ok = await insertPolicyRules('p1', [
      { ruleText: 'x', category: 'human-oversight', riskTier: 'all', origin: 'standard' },
    ]);
    expect(ok).toBe(true);
  });

  it('returns false on error', async () => {
    mockResult.mockResolvedValue({ error: { message: 'boom' } });
    const ok = await insertPolicyRules('p1', [
      { ruleText: 'x', category: 'human-oversight', riskTier: 'all', origin: 'standard' },
    ]);
    expect(ok).toBe(false);
  });
});

describe('savePolicySeedResponse', () => {
  it('returns true on success', async () => {
    mockResult.mockResolvedValue({ error: null });
    expect(
      await savePolicySeedResponse({ policyId: 'p1', answers: { Q1: 'x' }, createdBy: 'user1' }),
    ).toBe(true);
  });

  it('returns false on error', async () => {
    mockResult.mockResolvedValue({ error: { message: 'boom' } });
    expect(
      await savePolicySeedResponse({ policyId: 'p1', answers: { Q1: 'x' }, createdBy: 'user1' }),
    ).toBe(false);
  });
});

describe('activatePolicy', () => {
  it('returns true when both archive and activate succeed', async () => {
    mockResult.mockResolvedValue({ error: null });
    expect(await activatePolicy({ orgId: 'org1', policyId: 'p1' })).toBe(true);
  });

  it('returns false when the archive step errors', async () => {
    mockResult.mockResolvedValueOnce({ error: { message: 'boom' } });
    expect(await activatePolicy({ orgId: 'org1', policyId: 'p1' })).toBe(false);
  });

  it('returns false when the activate step errors', async () => {
    mockResult
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'boom' } });
    expect(await activatePolicy({ orgId: 'org1', policyId: 'p1' })).toBe(false);
  });
});
