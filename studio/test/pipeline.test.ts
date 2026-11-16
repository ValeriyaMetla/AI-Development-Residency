import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for the governed-run pipeline (Epic 3 Verify cards). Only the I/O edges are
 * mocked — the Claude call and the Data-Source accessors — so the REAL Domain logic runs under test:
 * self-critique (ADR-0015), the deterministic rule-check (ADR-0014), and policy inheritance
 * (ADR-0009). The Claude mock tells the draft call from the self-critique call by the "Challenger"
 * prompt, so each run is deterministic.
 */

vi.mock('@/lib/data/claude', () => ({ draftWithClaude: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({
  getSkillByKey: vi.fn(),
  createTaskRun: vi.fn(),
  updateTaskRunStatus: vi.fn(),
  saveTaskOutput: vi.fn(),
  saveGuardrailCheck: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
vi.mock('@/lib/data/policy', () => ({ getActivePolicy: vi.fn(), getPolicyRules: vi.fn() }));

import { draftWithClaude } from '@/lib/data/claude';
import { getSkillByKey, createTaskRun } from '@/lib/data/runs';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { runGovernedSkill } from '@/lib/domain/pipeline';

type Rule = { ruleText: string; category: string };
const OVERSIGHT: Rule = { ruleText: 'A person has the final say.', category: 'human-oversight' };
const DATA_PROTECTION: Rule = {
  ruleText: 'Minimize personal information.',
  category: 'data-protection',
};

// The Claude mock reads these per-test: the draft on the first call, the critique verdict on the
// second (detected by the "Challenger" system prompt).
let nextDraft = '';
let nextCritique = '';

function setClaude(draft: string, critiqueVerdict: 'pass' | 'revise' | 'block', revised?: string) {
  nextDraft = draft;
  nextCritique = JSON.stringify({
    verdict: critiqueVerdict,
    reason: 'test',
    ...(revised ? { revised } : {}),
  });
}

function setPolicy(policyId: string | null, rules: Rule[]) {
  vi.mocked(getActivePolicy).mockResolvedValue(policyId ? ({ id: policyId } as never) : null);
  vi.mocked(getPolicyRules).mockResolvedValue(rules as never);
}

const RUN = {
  skillKey: 'draft_thank_you',
  userInput: 'Maria, monthly gift',
  userId: 'u1',
  orgId: 'o1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSkillByKey).mockResolvedValue({ id: 'skill1', name: 'Draft a thank-you note' });
  vi.mocked(createTaskRun).mockResolvedValue('run1');
  vi.mocked(draftWithClaude).mockImplementation(async (system: string) =>
    system.includes('Challenger')
      ? { ok: true, text: nextCritique }
      : { ok: true, text: nextDraft },
  );
});

describe('Verify clean output passes without friction (Epic 3)', () => {
  it('a clean, on-policy draft completes with no needs-review', async () => {
    setPolicy('policyA', [OVERSIGHT]);
    setClaude('Thank you so much, Maria — your monthly gift keeps our doors open.', 'pass');

    const res = await runGovernedSkill(RUN);

    expect(res.status).toBe('completed');
    if (res.status === 'completed') {
      expect(res.guardrail.result).toBe('pass');
      expect(res.output).toContain('Thank you');
    }
  });

  it('keeps the false-positive rate at zero across a sample of clean notes', async () => {
    setPolicy('policyA', [OVERSIGHT, DATA_PROTECTION]); // even with a data-protection rule active...
    const cleanNotes = [
      'Thank you for your generous gift this year.',
      'We are so grateful for your support of our food drive.',
      'Your donation means the world to the families we serve.',
      'Thank you for volunteering your Saturday with us.',
    ];

    const statuses: string[] = [];
    for (const note of cleanNotes) {
      setClaude(note, 'pass'); // ...a note with no contact detail must still pass cleanly
      statuses.push((await runGovernedSkill(RUN)).status);
    }

    const falsePositives = statuses.filter((s) => s !== 'completed').length;
    expect(falsePositives).toBe(0);
  });
});

describe('Verify consistent reuse under current policy (Epic 3)', () => {
  it('same input + unchanged policy yields the same guardrail outcome and stamps the same policy', async () => {
    setPolicy('policyA', [OVERSIGHT]);
    setClaude('Thank you so much, Maria — we appreciate you.', 'pass');

    const first = await runGovernedSkill(RUN);
    const second = await runGovernedSkill(RUN);

    expect(first.status).toBe('completed');
    expect(second.status).toBe(first.status);
    if (first.status === 'completed' && second.status === 'completed') {
      expect(second.guardrail.result).toBe(first.guardrail.result);
    }
    // Both runs read the active policy and stamped it on the task_run (inheritance, no redeploy).
    expect(vi.mocked(createTaskRun).mock.calls.every((c) => c[0].policyId === 'policyA')).toBe(
      true,
    );
  });

  it('a policy change applies on the next run with no redeploy', async () => {
    // Same draft text (contains a contact detail) run under two different policies.
    const draftWithEmail = 'Thank you, Maria! Reach me at maria@example.org with any questions.';

    setPolicy('policyA', [OVERSIGHT]); // no data-protection rule → contact detail not flagged
    setClaude(draftWithEmail, 'pass');
    const before = await runGovernedSkill(RUN);

    setPolicy('policyB', [OVERSIGHT, DATA_PROTECTION]); // policy changed: now minimize PII
    setClaude(draftWithEmail, 'pass');
    const after = await runGovernedSkill(RUN);

    expect(before.status).toBe('completed'); // clean under the old policy
    expect(after.status).toBe('needs_review'); // the new rule flags the contact detail
    if (after.status === 'needs_review') {
      expect(after.guardrail.result).toBe('flag');
    }
    // The new policy was stamped on the later run — proof it took effect without a redeploy.
    const lastCall = vi.mocked(createTaskRun).mock.calls.at(-1);
    expect(lastCall?.[0].policyId).toBe('policyB');
  });
});
