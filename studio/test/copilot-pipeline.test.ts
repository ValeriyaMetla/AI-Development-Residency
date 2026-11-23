import { beforeEach, describe, expect, it, vi } from 'vitest';

// Card "Strip personal details in the Co-Pilot before the AI sees them": the Co-Pilot must remove
// personal details from the typed text before it is stored or sent to the model, exactly as Skill
// runs do, and log only the category names. The verdict must not change: tiering reads the
// checkbox answers, never the text.

vi.mock('@/lib/data/claude', () => ({ draftWithClaude: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({
  getSkillByKey: vi.fn(),
  createTaskRun: vi.fn(),
  updateTaskRunStatus: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
vi.mock('@/lib/data/policy', () => ({ getActivePolicy: vi.fn() }));
vi.mock('@/lib/data/standards', () => ({ getAllStandardRules: vi.fn() }));
vi.mock('@/lib/data/copilot', () => ({ saveCopilotAssessment: vi.fn() }));

import { draftWithClaude } from '@/lib/data/claude';
import { createTaskRun, getSkillByKey, writeAuditEvent } from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';
import { getAllStandardRules } from '@/lib/data/standards';
import { saveCopilotAssessment } from '@/lib/data/copilot';
import { removedNotice, runCopilotAssessment } from '@/lib/domain/copilot-pipeline';
import { detectPii } from '@/lib/domain/pii';
import type { SignalInput } from '@/lib/domain/copilot';

const RAW = {
  email: 'jane.doe@example.org',
  phone: '555-555-0199',
  ssn: '123-45-6789',
  card: '4111 1111 1111 1111',
};
const WITH_PII =
  `Can we use AI to write to our client ${RAW.email}, phone ${RAW.phone}, ` +
  `SSN ${RAW.ssn}, card ${RAW.card}?`;
const CLEAN = 'Can we use AI to draft our monthly newsletter?';

const NONE = {
  bannedPurpose: false,
  judgesPerson: false,
  highStakesDomain: false,
  sensitiveData: false,
  outputLeavesOrg: false,
} as unknown as SignalInput;
const SENSITIVE = { ...NONE, sensitiveData: true } as unknown as SignalInput;

function run(userInput: string, signals: SignalInput = NONE) {
  return runCopilotAssessment({ userInput, signals, userId: 'u1', orgId: 'o1' });
}

/** Every string the pipeline handed to the database or the model. */
function everythingSent(): string {
  return JSON.stringify([
    vi.mocked(createTaskRun).mock.calls,
    vi.mocked(draftWithClaude).mock.calls,
    vi.mocked(writeAuditEvent).mock.calls,
    vi.mocked(saveCopilotAssessment).mock.calls,
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSkillByKey).mockResolvedValue({ id: 's1' } as never);
  vi.mocked(getActivePolicy).mockResolvedValue(null);
  vi.mocked(getAllStandardRules).mockResolvedValue([
    {
      id: 'r1',
      code: 'nist-human-oversight',
      ruleText: 't',
      category: 'c',
      riskTier: 'all',
      citation: 'NIST',
    },
  ]);
  vi.mocked(createTaskRun).mockResolvedValue('run-1');
  vi.mocked(saveCopilotAssessment).mockResolvedValue('a1' as never);
  vi.mocked(draftWithClaude).mockResolvedValue({ ok: true, text: 'One sentence.' } as never);
});

describe('Co-Pilot strips personal details before storing or sending', () => {
  it('never hands a raw email, phone, SSN or card number to the database or the model', async () => {
    await run(WITH_PII);
    const sent = everythingSent();
    for (const value of Object.values(RAW)) expect(sent).not.toContain(value);
  });

  it('stores only the redacted summary, with the same placeholders Skill runs use', async () => {
    await run(WITH_PII);
    const summary = vi.mocked(createTaskRun).mock.calls[0][0].inputSummary;
    expect(detectPii(summary)).toEqual([]);
    expect(summary).toContain('[email removed]');
    expect(summary).toContain('[phone number removed]');
  });

  it('sends the model only the redacted text', async () => {
    await run(WITH_PII);
    const userText = vi.mocked(draftWithClaude).mock.calls[0][1];
    expect(detectPii(userText)).toEqual([]);
    expect(userText).toContain('[SSN removed]');
    expect(userText).toContain('[card number removed]');
  });

  it('logs a pii_stripped event with category names only, before the assessment event', async () => {
    await run(WITH_PII);
    const events = vi.mocked(writeAuditEvent).mock.calls.map((c) => c[0]);
    expect(events.map((e) => e.eventType)).toEqual(['pii_stripped', 'copilot_assessed']);
    expect(events[0].payload).toEqual({
      categories: expect.arrayContaining(['email', 'phone', 'us_ssn', 'credit_card']),
    });
  });

  it('tells the person what was removed, by kind, never by value', async () => {
    const result = await run(WITH_PII);
    expect(result.status).not.toBe('blocked');
    if (result.status === 'blocked') return;
    expect(result.piiNotice).toMatch(/^Personal information was removed before the AI saw it: /);
    expect(result.piiNotice).toContain('email address');
    for (const value of Object.values(RAW)) expect(result.piiNotice).not.toContain(value);
  });

  it('gives the same verdict with or without personal details in the text', async () => {
    for (const signals of [NONE, SENSITIVE]) {
      const withPii = await run(WITH_PII, signals);
      const clean = await run(CLEAN, signals);
      if (withPii.status === 'blocked' || clean.status === 'blocked') throw new Error('blocked');
      expect(withPii.recommendation.verdict).toBe(clean.recommendation.verdict);
      expect(withPii.recommendation.tier).toBe(clean.recommendation.tier);
      expect(withPii.status).toBe(clean.status);
    }
  });

  it('leaves clean text unchanged, logs no strip event and shows no notice', async () => {
    const result = await run(CLEAN);
    expect(vi.mocked(createTaskRun).mock.calls[0][0].inputSummary).toBe(CLEAN);
    expect(vi.mocked(draftWithClaude).mock.calls[0][1]).toBe(CLEAN);
    const types = vi.mocked(writeAuditEvent).mock.calls.map((c) => c[0].eventType);
    expect(types).toEqual(['copilot_assessed']);
    if (result.status === 'blocked') throw new Error('blocked');
    expect(result.piiNotice).toBeNull();
  });
});

describe('removedNotice', () => {
  it('matches the Skill runner wording and counts repeats', () => {
    expect(removedNotice(detectPii('a@example.org and b@example.org'))).toBe(
      'Personal information was removed before the AI saw it: 2 email addresses.',
    );
    expect(removedNotice([])).toBeNull();
  });
});
