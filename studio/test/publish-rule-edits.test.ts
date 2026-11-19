import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * publishRuleEdits — the rule editor's Service action (ADR-0024). Its first tests: the access-control
 * front door, input validation, and that a failed read of the current rules returns `failed` without
 * publishing (so a version can never be built from a blank rule list).
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({ getMyProfile: vi.fn() }));
vi.mock('@/lib/data/policy', () => ({
  activatePolicy: vi.fn(),
  getActivePolicy: vi.fn(),
  getPolicyRulesOrNull: vi.fn(),
}));
vi.mock('@/lib/domain/policy-publish', () => ({ publishEditedPolicy: vi.fn() }));
vi.mock('@/lib/domain/policy-seed', () => ({ seedPolicyFromAnswers: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { getActivePolicy, getPolicyRulesOrNull } from '@/lib/data/policy';
import { publishEditedPolicy } from '@/lib/domain/policy-publish';
import { publishRuleEdits } from '@/app/(app)/policy-seed/actions';

const VALID = { edits: [{ id: 'r1', ruleText: 'Edited rule' }], additions: [] };
const RULES = [
  { id: 'b1', isBaselineSafety: true },
  { id: 'r1', isBaselineSafety: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'leader1' } as never);
  vi.mocked(getMyProfile).mockResolvedValue({ role: 'accountable_leader' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
  vi.mocked(getActivePolicy).mockResolvedValue({ id: 'p1', name: 'Starter policy' } as never);
  vi.mocked(getPolicyRulesOrNull).mockResolvedValue(RULES as never);
  vi.mocked(publishEditedPolicy).mockResolvedValue({
    status: 'published',
    policyId: 'p2',
    ruleCount: 2,
  });
});

describe('publishRuleEdits — access control', () => {
  it('blocks when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await publishRuleEdits(VALID)).status).toBe('blocked');
    expect(publishEditedPolicy).not.toHaveBeenCalled();
  });

  it('blocks a Frontline Doer (Leader-only, enforced server-side)', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ role: 'frontline_doer' } as never);
    expect((await publishRuleEdits(VALID)).status).toBe('blocked');
    expect(publishEditedPolicy).not.toHaveBeenCalled();
  });

  it('blocks when there is no org or no active policy', async () => {
    vi.mocked(getMyOrgId).mockResolvedValue(null);
    expect((await publishRuleEdits(VALID)).status).toBe('blocked');
    vi.mocked(getMyOrgId).mockResolvedValue('org1');
    vi.mocked(getActivePolicy).mockResolvedValue(null);
    expect((await publishRuleEdits(VALID)).status).toBe('blocked');
    expect(publishEditedPolicy).not.toHaveBeenCalled();
  });

  it('blocks a malformed edit payload before any read or write', async () => {
    expect((await publishRuleEdits({ edits: 'nope' })).status).toBe('blocked');
    expect(publishEditedPolicy).not.toHaveBeenCalled();
  });
});

describe('publishRuleEdits — the current rules', () => {
  it('fails without publishing when the current rules cannot be read', async () => {
    vi.mocked(getPolicyRulesOrNull).mockResolvedValue(null);
    expect(await publishRuleEdits(VALID)).toEqual({
      status: 'failed',
      message: 'Could not load your current rules. Nothing was changed.',
    });
    expect(publishEditedPolicy).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('publishes from the AUTHORITATIVE server-read rules, then revalidates the page', async () => {
    expect(await publishRuleEdits(VALID)).toEqual({ status: 'published', ruleCount: 2 });
    expect(vi.mocked(publishEditedPolicy).mock.calls[0][0]).toMatchObject({
      orgId: 'org1',
      createdBy: 'leader1',
      policyName: 'Starter policy',
      current: RULES,
      input: VALID,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/policy-seed');
  });
});
