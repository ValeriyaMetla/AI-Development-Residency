import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/standards', () => ({ getAllStandardRules: vi.fn() }));
vi.mock('@/lib/data/policy', () => ({
  createPolicy: vi.fn(),
  insertPolicyRules: vi.fn(),
  savePolicySeedResponse: vi.fn(),
}));
vi.mock('@/lib/data/runs', () => ({ writeAuditEvent: vi.fn() }));

import { getAllStandardRules } from '@/lib/data/standards';
import { createPolicy, insertPolicyRules, savePolicySeedResponse } from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { seedPolicyFromAnswers } from '@/lib/domain/policy-seed';
import { EXPECTED_STANDARD_CODES, type PolicySeedAnswers } from '@/lib/domain/policy-seed-spec';

const standards = EXPECTED_STANDARD_CODES.map((code, i) => ({
  id: `id-${i}`,
  code,
  ruleText: `text ${code}`,
  category: 'cat',
  riskTier: 'all',
  citation: `cite ${code}`,
}));

const answers: PolicySeedAnswers = {
  accountablePerson: { name: 'Jane', role: 'ED' },
  purposes: ['Research'],
  handlesSensitiveData: 'yes',
  higherStakes: 'yes',
  externalContent: 'yes',
};

function happyMocks() {
  vi.mocked(getAllStandardRules).mockResolvedValue(standards);
  vi.mocked(createPolicy).mockResolvedValue('policy-1');
  vi.mocked(insertPolicyRules).mockResolvedValue(true);
  vi.mocked(savePolicySeedResponse).mockResolvedValue(true);
  vi.mocked(writeAuditEvent).mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.mocked(getAllStandardRules).mockReset();
  vi.mocked(createPolicy).mockReset();
  vi.mocked(insertPolicyRules).mockReset();
  vi.mocked(savePolicySeedResponse).mockReset();
  vi.mocked(writeAuditEvent).mockReset();
});

describe('seedPolicyFromAnswers — happy path', () => {
  it('creates a draft policy, saves rules + answers, audits, returns counts', async () => {
    happyMocks();
    const res = await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    expect(res.status).toBe('created');
    if (res.status === 'created') {
      expect(res.policyId).toBe('policy-1');
      expect(res.ruleCount).toBeGreaterThan(0);
      expect(res.needsReviewCount).toBe(0);
      // The generated rules are returned for the review screen, each grounded with a citation.
      expect(res.rules).toHaveLength(res.ruleCount);
      expect(res.rules.every((r) => r.standardRuleId || r.origin === 'custom')).toBe(true);
    }
    expect(createPolicy).toHaveBeenCalledOnce();
    expect(insertPolicyRules).toHaveBeenCalledOnce();
    expect(savePolicySeedResponse).toHaveBeenCalledOnce();
    expect(writeAuditEvent).toHaveBeenCalledOnce();
  });

  it('creates a DRAFT and does not auto-activate (human-in-the-loop)', async () => {
    happyMocks();
    await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    const createArg = vi.mocked(createPolicy).mock.calls[0][0];
    expect(createArg).toMatchObject({ orgId: 'org1' });
    expect(createArg).not.toHaveProperty('status'); // defaults to draft; nothing activates it here
  });

  it('counts needs_review rules produced by a safe default', async () => {
    happyMocks();
    const res = await seedPolicyFromAnswers({
      orgId: 'org1',
      createdBy: 'user1',
      answers: { ...answers, handlesSensitiveData: 'not_sure' },
    });
    if (res.status === 'created') expect(res.needsReviewCount).toBeGreaterThan(0);
  });
});

describe('seedPolicyFromAnswers — failure paths (resilience)', () => {
  it('fails cleanly when the standards library is empty', async () => {
    vi.mocked(getAllStandardRules).mockResolvedValue([]);
    const res = await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    expect(res.status).toBe('failed');
    expect(createPolicy).not.toHaveBeenCalled();
  });

  it('fails when the policy cannot be created', async () => {
    happyMocks();
    vi.mocked(createPolicy).mockResolvedValue(null);
    const res = await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    expect(res.status).toBe('failed');
    expect(insertPolicyRules).not.toHaveBeenCalled();
  });

  it('fails when the rules cannot be saved', async () => {
    happyMocks();
    vi.mocked(insertPolicyRules).mockResolvedValue(false);
    const res = await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    expect(res.status).toBe('failed');
    expect(savePolicySeedResponse).not.toHaveBeenCalled();
  });

  it('fails when the answers cannot be saved (and does not audit)', async () => {
    happyMocks();
    vi.mocked(savePolicySeedResponse).mockResolvedValue(false);
    const res = await seedPolicyFromAnswers({ orgId: 'org1', createdBy: 'user1', answers });
    expect(res.status).toBe('failed');
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });
});
