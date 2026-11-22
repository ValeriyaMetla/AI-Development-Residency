import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The two AI entry points pass the rate-limit gate before any Claude call (ADR-0030 · PenTest F-02 ·
 * SR-02 / SR-03). The database's claim_ai_request decides; each action claims ONE request after its
 * own sign-in and input checks, and a refusal returns a plain message WITHOUT calling the pipeline —
 * so no Claude call is made. The monthly Skill cap now fails closed too.
 */

vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn() }));
vi.mock('@/lib/data/rate-limit', () => ({ claimAiRequest: vi.fn() }));
vi.mock('@/lib/data/entitlements', () => ({
  getOrgEntitlement: vi.fn(),
  countOrgRunsThisMonth: vi.fn(),
}));
vi.mock('@/lib/domain/copilot-pipeline', () => ({ runCopilotAssessment: vi.fn() }));
vi.mock('@/lib/domain/pipeline', () => ({ runGovernedSkill: vi.fn() }));

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { claimAiRequest } from '@/lib/data/rate-limit';
import { getOrgEntitlement, countOrgRunsThisMonth } from '@/lib/data/entitlements';
import { runCopilotAssessment } from '@/lib/domain/copilot-pipeline';
import { runGovernedSkill } from '@/lib/domain/pipeline';
import { RATE_LIMIT_MESSAGES } from '@/lib/domain/rate-limit';
import { FREE_MONTHLY_RUN_CAP } from '@/lib/domain/entitlements';
import { assessUse } from '@/app/(app)/copilot/actions';
import { runSkill } from '@/app/(app)/skills/actions';

const COPILOT_INPUT = {
  userInput: 'Summarise our volunteer newsletter',
  signals: {},
  noneApply: true,
};
const COPILOT_DONE = { status: 'completed', assessmentId: 'a1', recommendation: {} } as never;
const SKILL_DONE = { status: 'completed', taskRunId: 'run-1' } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user1' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
  vi.mocked(claimAiRequest).mockResolvedValue('ok');
  vi.mocked(getOrgEntitlement).mockResolvedValue({ tier: 'free', premiumUntil: null });
  vi.mocked(countOrgRunsThisMonth).mockResolvedValue(3);
  vi.mocked(runCopilotAssessment).mockResolvedValue(COPILOT_DONE);
  vi.mocked(runGovernedSkill).mockResolvedValue(SKILL_DONE);
});

describe('assessUse (Co-Pilot) — rate-limit gate', () => {
  it('claims one copilot request, then runs the assessment', async () => {
    await expect(assessUse(COPILOT_INPUT)).resolves.toBe(COPILOT_DONE);
    expect(claimAiRequest).toHaveBeenCalledTimes(1);
    expect(claimAiRequest).toHaveBeenCalledWith('copilot');
    expect(runCopilotAssessment).toHaveBeenCalledTimes(1);
  });

  it.each(['user_minute', 'user_day', 'org_day', 'platform_day'] as const)(
    'refuses on %s without calling the pipeline (no Claude call)',
    async (reason) => {
      vi.mocked(claimAiRequest).mockResolvedValue(reason);
      await expect(assessUse(COPILOT_INPUT)).resolves.toEqual({
        status: 'blocked',
        message: RATE_LIMIT_MESSAGES[reason],
      });
      expect(runCopilotAssessment).not.toHaveBeenCalled();
    },
  );

  it('fails closed when the limit can’t be checked', async () => {
    vi.mocked(claimAiRequest).mockResolvedValue(null);
    await expect(assessUse(COPILOT_INPUT)).resolves.toEqual({
      status: 'blocked',
      message: RATE_LIMIT_MESSAGES.unavailable,
    });
    expect(runCopilotAssessment).not.toHaveBeenCalled();
  });

  it('does not use up a request on invalid input or a missing sign-in', async () => {
    await assessUse({ userInput: '   ', signals: {}, noneApply: true });
    await assessUse({ userInput: 'x'.repeat(2001), signals: {}, noneApply: true });
    await assessUse({ userInput: 'A real use', signals: {} }); // "none apply" not confirmed
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    await assessUse(COPILOT_INPUT);
    expect(claimAiRequest).not.toHaveBeenCalled();
    expect(runCopilotAssessment).not.toHaveBeenCalled();
  });
});

describe('runSkill — monthly cap (fails closed) and rate-limit gate', () => {
  it('claims one skill request, then runs the governed pipeline', async () => {
    await expect(runSkill('draft_thank_you', 'Thank Sam for volunteering')).resolves.toBe(
      SKILL_DONE,
    );
    expect(claimAiRequest).toHaveBeenCalledTimes(1);
    expect(claimAiRequest).toHaveBeenCalledWith('skill');
    expect(runGovernedSkill).toHaveBeenCalledTimes(1);
  });

  it.each(['user_minute', 'user_day', 'org_day', 'platform_day'] as const)(
    'refuses on %s without calling the pipeline (no Claude call)',
    async (reason) => {
      vi.mocked(claimAiRequest).mockResolvedValue(reason);
      await expect(runSkill('draft_thank_you', 'Thank Sam')).resolves.toEqual({
        status: 'blocked',
        message: RATE_LIMIT_MESSAGES[reason],
      });
      expect(runGovernedSkill).not.toHaveBeenCalled();
    },
  );

  it('fails closed when the limit can’t be checked', async () => {
    vi.mocked(claimAiRequest).mockResolvedValue(null);
    await expect(runSkill('draft_thank_you', 'Thank Sam')).resolves.toEqual({
      status: 'blocked',
      message: RATE_LIMIT_MESSAGES.unavailable,
    });
    expect(runGovernedSkill).not.toHaveBeenCalled();
  });

  it('SR-03: refuses when the monthly run count can’t be read (no longer treated as 0)', async () => {
    vi.mocked(countOrgRunsThisMonth).mockResolvedValue(null);
    await expect(runSkill('draft_thank_you', 'Thank Sam')).resolves.toEqual({
      status: 'blocked',
      message: RATE_LIMIT_MESSAGES.unavailable,
    });
    expect(claimAiRequest).not.toHaveBeenCalled();
    expect(runGovernedSkill).not.toHaveBeenCalled();
  });

  it('checks the monthly cap first, so a capped-out org doesn’t use up a daily request', async () => {
    vi.mocked(countOrgRunsThisMonth).mockResolvedValue(FREE_MONTHLY_RUN_CAP);
    const result = await runSkill('draft_thank_you', 'Thank Sam');
    expect(result.status).toBe('blocked');
    expect(claimAiRequest).not.toHaveBeenCalled();
    expect(runGovernedSkill).not.toHaveBeenCalled();
  });

  it('does not use up a request on an unknown Skill, empty input or a missing sign-in', async () => {
    await runSkill('not_a_skill', 'Thank Sam');
    await runSkill('draft_thank_you', '   ');
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    await runSkill('draft_thank_you', 'Thank Sam');
    expect(claimAiRequest).not.toHaveBeenCalled();
    expect(runGovernedSkill).not.toHaveBeenCalled();
  });
});
