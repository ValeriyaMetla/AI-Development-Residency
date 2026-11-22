import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PolicyRule } from '@/lib/data/policy';

/**
 * publishEditedPolicy (ADR-0024) — the one path every policy publish goes through (the editor and
 * accepting a rule suggestion). The writers are mocked; what's under test is the safety floor: a
 * publish from an empty rule list (a failed read) is refused, so a new version can never lose the
 * locked baseline rules.
 */

vi.mock('@/lib/data/policy', () => ({
  createPolicy: vi.fn(),
  insertPolicyRules: vi.fn(),
  activatePolicy: vi.fn(),
}));
vi.mock('@/lib/data/runs', () => ({ writeAuditEvent: vi.fn() }));

import { createPolicy, insertPolicyRules, activatePolicy } from '@/lib/data/policy';
import { writeAuditEvent } from '@/lib/data/runs';
import { publishEditedPolicy, publishImportedPolicy } from '@/lib/domain/policy-publish';
import { POLICY_CHANGE_MESSAGES } from '@/lib/domain/policy-activation';

const BASELINE = {
  id: 'b1',
  policyId: 'p1',
  ruleText: 'A person has the final say.',
  standardRuleId: 'sr1',
  citation: 'NIST AI RMF (2023), GOVERN function',
  category: 'human-oversight',
  riskTier: 'all',
  origin: 'standard',
  isBaselineSafety: true,
  needsReview: false,
  sourceQuestion: 'Q1',
  suggestionKey: null,
  createdAt: '2026-11-13T00:00:00Z',
} satisfies PolicyRule;

const params = (current: PolicyRule[], additions: string[] = ['A new custom rule']) => ({
  orgId: 'org1',
  createdBy: 'leader1',
  policyName: 'Starter policy',
  current,
  input: { edits: [], additions },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createPolicy).mockResolvedValue('p2');
  vi.mocked(insertPolicyRules).mockResolvedValue(true);
  vi.mocked(activatePolicy).mockResolvedValue('ok');
});

// ADR-0031 / F-18: if the protected activation step refuses or errors, the publish reports the
// database's reason and that nothing changed — never "published" — and writes no audit event.
describe('publishEditedPolicy / publishImportedPolicy — activation refused', () => {
  it.each([
    ['not_leader', POLICY_CHANGE_MESSAGES.not_leader],
    ['no_rules', POLICY_CHANGE_MESSAGES.no_rules],
    [null, POLICY_CHANGE_MESSAGES.unavailable],
  ])('an edit whose activation returns %j fails with its message', async (outcome, message) => {
    vi.mocked(activatePolicy).mockResolvedValue(outcome);
    expect(await publishEditedPolicy(params([BASELINE]))).toEqual({ status: 'failed', message });
    expect(activatePolicy).toHaveBeenCalledWith('p2');
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });

  it('an import whose activation errors fails with the "nothing changed" message', async () => {
    vi.mocked(activatePolicy).mockResolvedValue(null);
    const res = await publishImportedPolicy({
      orgId: 'org1',
      createdBy: 'leader1',
      policyName: 'Imported policy',
      rules: [BASELINE],
    });
    expect(res).toEqual({ status: 'failed', message: POLICY_CHANGE_MESSAGES.unavailable });
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });
});

describe('publishEditedPolicy — safety floor', () => {
  it('refuses to publish from an empty rule list (a failed read) and writes nothing', async () => {
    const res = await publishEditedPolicy(params([]));
    expect(res).toEqual({
      status: 'failed',
      message: 'Could not load your current rules. Nothing was changed.',
    });
    expect(createPolicy).not.toHaveBeenCalled();
    expect(insertPolicyRules).not.toHaveBeenCalled();
    expect(activatePolicy).not.toHaveBeenCalled();
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });

  it('publishes normally when the current rules are present, carrying the baseline forward', async () => {
    const res = await publishEditedPolicy(params([BASELINE]));
    expect(res).toEqual({ status: 'published', policyId: 'p2', ruleCount: 2 });
    const written = vi.mocked(insertPolicyRules).mock.calls[0][1].map((r) => r.ruleText);
    expect(written).toEqual(['A person has the final say.', 'A new custom rule']);
  });
});
