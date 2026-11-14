import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn() }));
vi.mock('@/lib/domain/policy-seed', () => ({ seedPolicyFromAnswers: vi.fn() }));
vi.mock('@/lib/data/policy', () => ({ activatePolicy: vi.fn() }));

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { seedPolicyFromAnswers } from '@/lib/domain/policy-seed';
import { activatePolicy } from '@/lib/data/policy';
import { runPolicySeed, confirmPolicy } from '@/app/policy-seed/actions';

const validAnswers = {
  accountablePerson: { name: 'Jane', role: 'ED' },
  purposes: ['Research'],
  handlesSensitiveData: 'yes',
  higherStakes: 'yes',
};

function signedIn() {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user1' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(getMyOrgId).mockReset();
  vi.mocked(seedPolicyFromAnswers).mockReset();
  vi.mocked(activatePolicy).mockReset();
});

describe('runPolicySeed', () => {
  it('blocks when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await runPolicySeed(validAnswers)).status).toBe('blocked');
    expect(seedPolicyFromAnswers).not.toHaveBeenCalled();
  });

  it('blocks when there is no org', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user1' } as never);
    vi.mocked(getMyOrgId).mockResolvedValue(null);
    expect((await runPolicySeed(validAnswers)).status).toBe('blocked');
  });

  it('blocks invalid answers before calling the generator', async () => {
    signedIn();
    const res = await runPolicySeed({ purposes: [] });
    expect(res.status).toBe('blocked');
    expect(seedPolicyFromAnswers).not.toHaveBeenCalled();
  });

  it('delegates valid answers to the generator and returns its result', async () => {
    signedIn();
    vi.mocked(seedPolicyFromAnswers).mockResolvedValue({
      status: 'created',
      policyId: 'p1',
      ruleCount: 10,
      needsReviewCount: 0,
      rules: [],
    });
    const res = await runPolicySeed(validAnswers);
    expect(res).toMatchObject({ status: 'created', policyId: 'p1' });
    expect(seedPolicyFromAnswers).toHaveBeenCalledOnce();
    const arg = vi.mocked(seedPolicyFromAnswers).mock.calls[0][0];
    expect(arg).toMatchObject({ orgId: 'org1', createdBy: 'user1' });
  });
});

describe('confirmPolicy', () => {
  it('blocks when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await confirmPolicy('p1')).status).toBe('blocked');
    expect(activatePolicy).not.toHaveBeenCalled();
  });

  it('blocks an empty policy id', async () => {
    signedIn();
    expect((await confirmPolicy('')).status).toBe('blocked');
    expect(activatePolicy).not.toHaveBeenCalled();
  });

  it('activates and reports success', async () => {
    signedIn();
    vi.mocked(activatePolicy).mockResolvedValue(true);
    expect(await confirmPolicy('p1')).toEqual({ status: 'activated', policyId: 'p1' });
    expect(activatePolicy).toHaveBeenCalledWith({ orgId: 'org1', policyId: 'p1' });
  });

  it('reports failure when activation fails', async () => {
    signedIn();
    vi.mocked(activatePolicy).mockResolvedValue(false);
    expect((await confirmPolicy('p1')).status).toBe('failed');
  });
});
