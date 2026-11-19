import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Rule-suggestion Service actions (ADR-0025). The access-control front door: signed in, Accountable
 * Leader, an org — checked server-side on every call — then untrusted input validated before the
 * Domain is reached.
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({ getMyProfile: vi.fn() }));
vi.mock('@/lib/domain/rule-suggestion-decide', () => ({
  acceptSuggestion: vi.fn(),
  dismissSuggestion: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { acceptSuggestion, dismissSuggestion } from '@/lib/domain/rule-suggestion-decide';
import {
  acceptRuleSuggestion,
  dismissRuleSuggestion,
} from '@/app/(app)/policy-seed/suggestion-actions';

function asLeader() {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'leader1' } as never);
  vi.mocked(getMyProfile).mockResolvedValue({ role: 'accountable_leader' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
}

beforeEach(() => {
  vi.clearAllMocks();
  asLeader();
  vi.mocked(acceptSuggestion).mockResolvedValue({ status: 'accepted', policyId: 'policy2' });
  vi.mocked(dismissSuggestion).mockResolvedValue({ status: 'dismissed' });
});

const VALID = { suggestionKey: 'risky:medical', ruleText: 'Our rule.' };

describe('access control — both actions', () => {
  it.each([
    ['accept', () => acceptRuleSuggestion(VALID)],
    ['dismiss', () => dismissRuleSuggestion(VALID)],
  ])('%s: blocks when signed out', async (_n, act) => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await act()).status).toBe('blocked');
    expect(acceptSuggestion).not.toHaveBeenCalled();
    expect(dismissSuggestion).not.toHaveBeenCalled();
  });

  it.each([
    ['accept', () => acceptRuleSuggestion(VALID)],
    ['dismiss', () => dismissRuleSuggestion(VALID)],
  ])('%s: blocks a Frontline Doer (Leader-only, enforced server-side)', async (_n, act) => {
    vi.mocked(getMyProfile).mockResolvedValue({ role: 'frontline_doer' } as never);
    expect((await act()).status).toBe('blocked');
    expect(acceptSuggestion).not.toHaveBeenCalled();
    expect(dismissSuggestion).not.toHaveBeenCalled();
  });

  it.each([
    ['accept', () => acceptRuleSuggestion(VALID)],
    ['dismiss', () => dismissRuleSuggestion(VALID)],
  ])('%s: blocks when there is no org', async (_n, act) => {
    vi.mocked(getMyOrgId).mockResolvedValue(null);
    expect((await act()).status).toBe('blocked');
  });
});

describe('input validation', () => {
  it.each([
    null,
    'risky:medical',
    {},
    { suggestionKey: 'medical' },
    { suggestionKey: 'risky:Medical!' },
  ])('blocks a malformed request: %j', async (input) => {
    expect((await acceptRuleSuggestion(input)).status).toBe('blocked');
    expect((await dismissRuleSuggestion(input)).status).toBe('blocked');
    expect(acceptSuggestion).not.toHaveBeenCalled();
    expect(dismissSuggestion).not.toHaveBeenCalled();
  });

  it('accept requires rule text; dismiss does not', async () => {
    expect((await acceptRuleSuggestion({ suggestionKey: 'risky:medical' })).status).toBe('blocked');
    expect((await dismissRuleSuggestion({ suggestionKey: 'risky:medical' })).status).toBe(
      'dismissed',
    );
  });
});

describe('happy path', () => {
  it('accept hands the caller’s org/user + key/text to the Domain and revalidates the page', async () => {
    expect(await acceptRuleSuggestion(VALID)).toEqual({ status: 'accepted', policyId: 'policy2' });
    expect(acceptSuggestion).toHaveBeenCalledWith({
      orgId: 'org1',
      userId: 'leader1',
      suggestionKey: 'risky:medical',
      ruleText: 'Our rule.',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/policy-seed');
  });

  it('dismiss hands off and revalidates; a failure does not revalidate', async () => {
    await dismissRuleSuggestion({ suggestionKey: 'pii:us_ssn' });
    expect(dismissSuggestion).toHaveBeenCalledWith({
      orgId: 'org1',
      userId: 'leader1',
      suggestionKey: 'pii:us_ssn',
    });
    expect(revalidatePath).toHaveBeenCalledTimes(1);

    vi.mocked(dismissSuggestion).mockResolvedValue({ status: 'failed', message: 'x' });
    await dismissRuleSuggestion({ suggestionKey: 'pii:us_ssn' });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
