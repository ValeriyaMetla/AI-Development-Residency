import { beforeEach, describe, expect, it, vi } from 'vitest';

// Card "Show reviewers why a Co-Pilot assessment was flagged". Two layers:
// 1. `toCopilotReview` turns the stored assessment JSON into the review view, checking its shape.
// 2. `listPendingReviews` attaches that view to Co-Pilot runs only (mocked database, as in
//    policy.test.ts: every builder method returns the builder; awaiting resolves mockResult()).

const mockResult = vi.fn();
const calls: [string, unknown[]][] = [];

vi.mock('@/lib/data/supabase/server', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockResult()).then(resolve, reject);
  const client = { from: () => builder };
  return { createClient: () => Promise.resolve(client) };
});

import { listPendingReviews } from '@/lib/data/runs';
import { toCopilotReview, VERDICT_TITLES } from '@/lib/domain/copilot-review';

/** A stored recommendation as the Co-Pilot pipeline writes it (FinalRecommendation, ADR-0010). */
const recommendation = {
  verdict: 'use_with_conditions',
  tier: 'high',
  summary: 'You can go ahead only if a named person makes the final decision.',
  reasons: [
    {
      signalKey: 'judgesPerson',
      plainText: 'It would judge or rank a specific person.',
      citationCodes: ['euaiact-human-override'],
      citations: [
        { code: 'euaiact-human-override', text: 'EU AI Act, Article 14', source: 'standard' },
      ],
    },
  ],
  saferWay: {
    mitigations: [{ plainText: 'Have a named person make the final decision.' }],
    noSafePath: false,
  },
};
const stored = { verdict: 'use_with_conditions', tier: 'high', recommendation };

describe('toCopilotReview', () => {
  it('shows the verdict, risk level, explanation, reasons with sources and safer-way steps', () => {
    const r = toCopilotReview(stored)!;
    expect(r.verdictTitle).toBe('Use with conditions');
    expect(r.riskLabel).toMatch(/High-risk/);
    expect(r.explanation).toMatch(/named person/);
    expect(r.reasons).toEqual([
      { text: 'It would judge or rank a specific person.', sources: ['EU AI Act, Article 14'] },
    ]);
    expect(r.saferWay).toEqual({
      steps: ['Have a named person make the final decision.'],
      noSafePath: false,
    });
    expect(r.approvable).toBe(true);
  });

  it('never makes a "Don\'t use AI for this" assessment approvable (Val, 2026-11-23)', () => {
    const r = toCopilotReview({ ...stored, verdict: 'dont', tier: 'prohibited' })!;
    expect(r.verdictTitle).toBe("Don't use AI for this");
    expect(r.approvable).toBe(false);
  });

  it('accepts an assessment with no safer-way section', () => {
    const r = toCopilotReview({ ...stored, recommendation: { ...recommendation, saferWay: null } });
    expect(r?.saferWay).toBeNull();
  });

  it.each([
    ['an unknown verdict', { ...stored, verdict: 'maybe' }],
    ['an unknown tier', { ...stored, tier: 'extreme' }],
    ['no recommendation object', { ...stored, recommendation: null }],
    ['no reasons', { ...stored, recommendation: { ...recommendation, reasons: [] } }],
    ['a reason without text', { ...stored, recommendation: { ...recommendation, reasons: [{}] } }],
    [
      'a malformed safer-way',
      { ...stored, recommendation: { ...recommendation, saferWay: { mitigations: 'x' } } },
    ],
  ])('returns null (not half the reasons) for %s', (_label, row) => {
    expect(toCopilotReview(row)).toBeNull();
  });

  it('keeps one set of verdict titles for the form and the review screen', () => {
    expect(Object.keys(VERDICT_TITLES).sort()).toEqual(
      ['dont', 'out_of_scope', 'use', 'use_with_conditions'].sort(),
    );
  });
});

describe('listPendingReviews', () => {
  beforeEach(() => {
    mockResult.mockReset();
    calls.length = 0;
  });

  it('reads the stored assessment and the skill key, and only waiting runs', async () => {
    mockResult.mockReturnValue({ data: [], error: null });
    await listPendingReviews();
    const select = String(calls.find(([m]) => m === 'select')?.[1][0]);
    expect(select).toContain('copilot_assessment ( verdict, tier, recommendation )');
    expect(select).toContain('skill:skill_id ( name, key )');
    expect(calls).toContainEqual(['eq', ['status', 'needs_review']]);
  });

  it('attaches the advice to Co-Pilot runs and nothing to Skill runs', async () => {
    mockResult.mockReturnValue({
      data: [
        {
          id: 'run-copilot',
          input_summary: 'Rank applicants with AI',
          created_at: '2026-11-22T10:00:00Z',
          skill: { name: 'Governance Co-Pilot', key: 'governance_copilot' },
          copilot_assessment: [stored],
          task_output: [],
          guardrail_check: [],
        },
        {
          id: 'run-skill',
          input_summary: 'Thank a donor',
          created_at: '2026-11-22T09:00:00Z',
          skill: { name: 'Draft a thank-you note', key: 'draft_thank_you' },
          copilot_assessment: [],
          task_output: [{ content: 'Dear donor…', provenance_label: 'AI-generated' }],
          guardrail_check: [],
        },
      ],
      error: null,
    });
    const [copilot, skill] = (await listPendingReviews())!;
    expect(copilot.copilot?.verdictTitle).toBe('Use with conditions');
    expect('copilot' in skill).toBe(false);
    expect(skill.output).toBe('Dear donor…');
  });

  it('marks a Co-Pilot run with no stored assessment as "couldn\'t load" (null)', async () => {
    mockResult.mockReturnValue({
      data: [
        {
          id: 'run-copilot',
          input_summary: 'x',
          created_at: '2026-11-22T10:00:00Z',
          skill: { name: 'Governance Co-Pilot', key: 'governance_copilot' },
          copilot_assessment: [],
          task_output: [],
          guardrail_check: [],
        },
      ],
      error: null,
    });
    const [item] = (await listPendingReviews())!;
    expect('copilot' in item).toBe(true);
    expect(item.copilot).toBeNull();
  });

  it('still returns null on a query error (page shows its error state)', async () => {
    mockResult.mockReturnValue({ data: null, error: { message: 'boom' } });
    expect(await listPendingReviews()).toBeNull();
  });
});
