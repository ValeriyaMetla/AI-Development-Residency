import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn() }));
vi.mock('@/lib/domain/policy-seed', () => ({ seedPolicyFromAnswers: vi.fn() }));
vi.mock('@/lib/data/policy', () => ({ activatePolicy: vi.fn(), archiveDraftPolicies: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({ getMyProfile: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { seedPolicyFromAnswers } from '@/lib/domain/policy-seed';
import { activatePolicy, archiveDraftPolicies } from '@/lib/data/policy';
import { getMyProfile } from '@/lib/data/profile';
import { runPolicySeed, confirmPolicy, discardDraftPolicy } from '@/app/(app)/policy-seed/actions';

const validAnswers = {
  accountablePerson: { name: 'Jane', role: 'ED' },
  purposes: ['Research'],
  handlesSensitiveData: 'yes',
  higherStakes: 'yes',
};

function signedIn(role: 'accountable_leader' | 'frontline_doer' = 'accountable_leader') {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user1' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
  vi.mocked(getMyProfile).mockResolvedValue({ display_name: 'Jane', role, org: null } as never);
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(getMyOrgId).mockReset();
  vi.mocked(seedPolicyFromAnswers).mockReset();
  vi.mocked(activatePolicy).mockReset();
  vi.mocked(archiveDraftPolicies).mockReset();
  vi.mocked(getMyProfile).mockReset();
});

describe('runPolicySeed', () => {
  it('blocks when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await runPolicySeed(validAnswers)).status).toBe('blocked');
    expect(seedPolicyFromAnswers).not.toHaveBeenCalled();
  });

  it('blocks when there is no org', async () => {
    signedIn();
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

// Setting up the policy is Leader-only (secure-coding A01), enforced server-side on every action.
describe('seed actions are Leader-only', () => {
  it('blocks a Frontline Doer from generating a policy', async () => {
    signedIn('frontline_doer');
    const res = await runPolicySeed(validAnswers);
    expect(res).toMatchObject({ status: 'blocked' });
    expect(seedPolicyFromAnswers).not.toHaveBeenCalled();
  });

  it('blocks a Frontline Doer from activating a policy', async () => {
    signedIn('frontline_doer');
    expect((await confirmPolicy('p1')).status).toBe('blocked');
    expect(activatePolicy).not.toHaveBeenCalled();
  });

  it('blocks a Frontline Doer from discarding a draft', async () => {
    signedIn('frontline_doer');
    expect((await discardDraftPolicy()).status).toBe('blocked');
    expect(archiveDraftPolicies).not.toHaveBeenCalled();
  });

  it('blocks when the profile cannot be read (fails closed)', async () => {
    signedIn();
    vi.mocked(getMyProfile).mockResolvedValue(null);
    expect((await confirmPolicy('p1')).status).toBe('blocked');
    expect(activatePolicy).not.toHaveBeenCalled();
  });
});

describe('discardDraftPolicy ("Start over")', () => {
  it('blocks when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await discardDraftPolicy()).status).toBe('blocked');
    expect(archiveDraftPolicies).not.toHaveBeenCalled();
  });

  it("archives the leader's own org drafts and reports success", async () => {
    signedIn();
    vi.mocked(archiveDraftPolicies).mockResolvedValue(true);
    expect(await discardDraftPolicy()).toEqual({ status: 'discarded' });
    expect(archiveDraftPolicies).toHaveBeenCalledWith('org1');
  });

  it('reports failure when archiving fails', async () => {
    signedIn();
    vi.mocked(archiveDraftPolicies).mockResolvedValue(false);
    expect((await discardDraftPolicy()).status).toBe('failed');
  });
});
