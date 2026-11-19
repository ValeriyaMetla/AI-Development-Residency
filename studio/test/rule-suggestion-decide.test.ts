import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PolicyRule } from '@/lib/data/policy';

/**
 * Build "accept suggested rule" flow — the Domain decision (ADR-0025). Data edges and the publish
 * writer are mocked; the trust boundary and ordering are what's under test: the suggestion is
 * re-derived server-side, the client's text is the only thing it supplies, nothing publishes from a
 * failed rules read, and decisions + audit carry no rule text.
 */

vi.mock('@/lib/domain/rule-suggestion-service', () => ({ getRuleSuggestions: vi.fn() }));
vi.mock('@/lib/data/policy', () => ({ getActivePolicy: vi.fn(), getPolicyRules: vi.fn() }));
vi.mock('@/lib/data/suggestions', () => ({ recordSuggestionDecision: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ writeAuditEvent: vi.fn() }));
vi.mock('@/lib/domain/policy-publish', () => ({ publishEditedPolicy: vi.fn() }));

import { getRuleSuggestions } from '@/lib/domain/rule-suggestion-service';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { recordSuggestionDecision } from '@/lib/data/suggestions';
import { writeAuditEvent } from '@/lib/data/runs';
import { publishEditedPolicy } from '@/lib/domain/policy-publish';
import { acceptSuggestion, dismissSuggestion } from '@/lib/domain/rule-suggestion-decide';

const SUGGESTION = {
  key: 'risky:medical',
  ruleText: 'We don’t use AI to give medical advice, and a person checks any health-related draft.',
  standardRuleId: 'sr-override',
  citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
  category: 'human-oversight',
  riskTier: 'high',
  count: 4,
  windowDays: 30,
  evidenceLabel: 'Health-related tasks — 4 times in the last 30 days',
};

const RULES = [
  { id: 'b1', ruleText: 'A person has the final say.', isBaselineSafety: true },
  { id: 'r1', ruleText: 'We use AI to draft donor notes.', isBaselineSafety: false },
] as PolicyRule[];

const ACCEPT = {
  orgId: 'org1',
  userId: 'leader1',
  suggestionKey: 'risky:medical',
  ruleText: 'Reworded by the leader.',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRuleSuggestions).mockResolvedValue({ status: 'ok', suggestions: [SUGGESTION] });
  vi.mocked(getActivePolicy).mockResolvedValue({ id: 'policy1', name: 'Starter policy' } as never);
  vi.mocked(getPolicyRules).mockResolvedValue(RULES);
  vi.mocked(publishEditedPolicy).mockResolvedValue({
    status: 'published',
    policyId: 'policy2',
    ruleCount: 3,
  });
  vi.mocked(recordSuggestionDecision).mockResolvedValue(true);
});

describe('acceptSuggestion — publishes a new version with the suggestion', () => {
  it('keeps every current rule and adds the suggestion with SERVER-side citation + category', async () => {
    const res = await acceptSuggestion(ACCEPT);
    expect(res).toEqual({ status: 'accepted', policyId: 'policy2' });

    const call = vi.mocked(publishEditedPolicy).mock.calls[0][0];
    expect(call.current).toBe(RULES);
    expect(call.input.edits).toEqual([{ id: 'r1', ruleText: 'We use AI to draft donor notes.' }]);
    expect(call.input.additions).toEqual([]);
    expect(call.input.suggested).toEqual({
      suggestionKey: 'risky:medical',
      ruleText: 'Reworded by the leader.', // the only client-supplied field
      standardRuleId: 'sr-override',
      citation: SUGGESTION.citation,
      category: 'human-oversight',
      riskTier: 'high',
    });
  });

  it('records an "accepted" decision with the new policy id, and audits without rule text', async () => {
    await acceptSuggestion(ACCEPT);
    expect(vi.mocked(recordSuggestionDecision)).toHaveBeenCalledWith({
      orgId: 'org1',
      suggestionKey: 'risky:medical',
      decision: 'accepted',
      decidedBy: 'leader1',
      policyId: 'policy2',
    });
    const audit = vi.mocked(writeAuditEvent).mock.calls[0][0];
    expect(audit.eventType).toBe('rule_suggestion_accepted');
    expect(audit.payload).toEqual({ suggestionKey: 'risky:medical', policyId: 'policy2' });
    expect(JSON.stringify(audit.payload)).not.toContain('Reworded');
  });

  it('still reports accepted if the decision write fails after a successful publish', async () => {
    vi.mocked(recordSuggestionDecision).mockResolvedValue(false);
    expect((await acceptSuggestion(ACCEPT)).status).toBe('accepted');
  });
});

describe('acceptSuggestion — refuses what it should', () => {
  it('blocks a key that is not currently surfaced (already decided, covered, or not recurring)', async () => {
    vi.mocked(getRuleSuggestions).mockResolvedValue({ status: 'ok', suggestions: [] });
    expect((await acceptSuggestion(ACCEPT)).status).toBe('blocked');
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('blocks a key that differs from what is surfaced (never accepts some other suggestion)', async () => {
    vi.mocked(getRuleSuggestions).mockResolvedValue({
      status: 'ok',
      suggestions: [{ ...SUGGESTION, key: 'pii:us_ssn' }],
    });
    expect((await acceptSuggestion(ACCEPT)).status).toBe('blocked');
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('fails when suggestions are unavailable', async () => {
    vi.mocked(getRuleSuggestions).mockResolvedValue({ status: 'unavailable', message: 'x' });
    expect((await acceptSuggestion(ACCEPT)).status).toBe('failed');
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('blocks when there is no active policy', async () => {
    vi.mocked(getActivePolicy).mockResolvedValue(null);
    expect((await acceptSuggestion(ACCEPT)).status).toBe('blocked');
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('fails closed when the current rules read comes back empty (never drops the baselines)', async () => {
    vi.mocked(getPolicyRules).mockResolvedValue([]);
    expect((await acceptSuggestion(ACCEPT)).status).toBe('failed');
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('passes a publish failure through and records no decision', async () => {
    vi.mocked(publishEditedPolicy).mockResolvedValue({
      status: 'blocked',
      message: 'A rule can’t be empty.',
    });
    expect(await acceptSuggestion(ACCEPT)).toEqual({
      status: 'blocked',
      message: 'A rule can’t be empty.',
    });
    expect(vi.mocked(recordSuggestionDecision)).not.toHaveBeenCalled();
    expect(vi.mocked(writeAuditEvent)).not.toHaveBeenCalled();
  });
});

describe('dismissSuggestion', () => {
  it('records a "dismissed" decision and audits it — no policy change', async () => {
    const res = await dismissSuggestion({
      orgId: 'org1',
      userId: 'leader1',
      suggestionKey: 'pii:us_ssn',
    });
    expect(res).toEqual({ status: 'dismissed' });
    expect(vi.mocked(recordSuggestionDecision)).toHaveBeenCalledWith({
      orgId: 'org1',
      suggestionKey: 'pii:us_ssn',
      decision: 'dismissed',
      decidedBy: 'leader1',
    });
    expect(vi.mocked(writeAuditEvent).mock.calls[0][0]).toMatchObject({
      eventType: 'rule_suggestion_dismissed',
      payload: { suggestionKey: 'pii:us_ssn' },
    });
    expect(vi.mocked(publishEditedPolicy)).not.toHaveBeenCalled();
  });

  it('blocks a key that is not in the catalog (nothing arbitrary is stored)', async () => {
    for (const suggestionKey of ['risky:ranking-people', 'pii:email', 'risky:made-up']) {
      expect(
        (await dismissSuggestion({ orgId: 'org1', userId: 'leader1', suggestionKey })).status,
      ).toBe('blocked');
    }
    expect(vi.mocked(recordSuggestionDecision)).not.toHaveBeenCalled();
  });

  it('fails (and does not audit) when the decision cannot be saved', async () => {
    vi.mocked(recordSuggestionDecision).mockResolvedValue(false);
    const res = await dismissSuggestion({
      orgId: 'org1',
      userId: 'leader1',
      suggestionKey: 'pii:us_ssn',
    });
    expect(res.status).toBe('failed');
    expect(vi.mocked(writeAuditEvent)).not.toHaveBeenCalled();
  });
});
