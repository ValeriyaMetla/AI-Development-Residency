import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Rule-suggestion data accessor (ADR-0025). The Supabase client is mocked; the builder records each
 * call so the test can prove the read is narrow (no `actor` column) and filtered to the signal
 * events inside the window.
 */

const mockResult = vi.fn();
const calls: { method: string; args: unknown[] }[] = [];

vi.mock('@/lib/data/supabase/server', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'in', 'gte', 'insert']) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockResult()).then(resolve, reject);
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  };
  return { createClient: () => Promise.resolve(client) };
});

import {
  getSuggestionSignalsSince,
  getSuggestionDecisionKeys,
  recordSuggestionDecision,
  mapSignalEventRow,
  SIGNAL_EVENT_TYPES,
} from '@/lib/data/suggestions';

const row = {
  task_run_id: 'run1',
  event_type: 'pii_stripped' as const,
  payload: { categories: ['us_ssn'] },
  created_at: '2026-11-17T00:00:00Z',
};

beforeEach(() => {
  calls.length = 0;
  mockResult.mockReset();
});

describe('mapSignalEventRow', () => {
  it('maps snake_case to camelCase and passes the payload through', () => {
    expect(mapSignalEventRow(row)).toEqual({
      taskRunId: 'run1',
      eventType: 'pii_stripped',
      payload: { categories: ['us_ssn'] },
      createdAt: '2026-11-17T00:00:00Z',
    });
  });
});

describe('getSuggestionSignalsSince', () => {
  it('reads only the signal events since the window start, and maps them', async () => {
    mockResult.mockReturnValue({ data: [row], error: null });
    const res = await getSuggestionSignalsSince('2026-10-19T00:00:00Z');
    expect(res).toEqual([mapSignalEventRow(row)]);

    expect(calls.find((c) => c.method === 'from')?.args).toEqual(['audit_event']);
    expect(calls.find((c) => c.method === 'in')?.args).toEqual([
      'event_type',
      [...SIGNAL_EVENT_TYPES],
    ]);
    expect(calls.find((c) => c.method === 'gte')?.args).toEqual([
      'created_at',
      '2026-10-19T00:00:00Z',
    ]);
  });

  it('never selects who ran the task (no actor / run_by)', async () => {
    mockResult.mockReturnValue({ data: [], error: null });
    await getSuggestionSignalsSince('2026-10-19T00:00:00Z');
    const columns = String(calls.find((c) => c.method === 'select')?.args[0]);
    expect(columns).not.toMatch(/actor|run_by|\*/);
    expect(columns.split(',').map((c) => c.trim())).toEqual([
      'task_run_id',
      'event_type',
      'payload',
      'created_at',
    ]);
  });

  it('returns [] when there is nothing yet', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    expect(await getSuggestionSignalsSince('2026-10-19T00:00:00Z')).toEqual([]);
  });

  it('returns null on error, so a failure is not mistaken for "nothing recurring"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResult.mockReturnValue({ data: null, error: { message: 'boom' } });
    expect(await getSuggestionSignalsSince('2026-10-19T00:00:00Z')).toBeNull();
  });
});

describe('getSuggestionDecisionKeys', () => {
  it('reads only the suggestion key from the decision table and returns a set', async () => {
    mockResult.mockReturnValue({
      data: [{ suggestion_key: 'risky:medical' }, { suggestion_key: 'pii:us_ssn' }],
      error: null,
    });
    const res = await getSuggestionDecisionKeys();
    expect(res).toEqual(new Set(['risky:medical', 'pii:us_ssn']));
    expect(calls.find((c) => c.method === 'from')?.args).toEqual(['rule_suggestion_decision']);
    expect(calls.find((c) => c.method === 'select')?.args).toEqual(['suggestion_key']); // never who decided
  });

  it('returns an empty set when nothing has been decided', async () => {
    mockResult.mockReturnValue({ data: null, error: null });
    expect(await getSuggestionDecisionKeys()).toEqual(new Set());
  });

  it('returns null on error, so the caller can fail closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResult.mockReturnValue({ data: null, error: { message: 'boom' } });
    expect(await getSuggestionDecisionKeys()).toBeNull();
  });
});

describe('recordSuggestionDecision', () => {
  it('appends one row for the caller’s org, key, decision, and the published policy', async () => {
    mockResult.mockReturnValue({ error: null });
    const ok = await recordSuggestionDecision({
      orgId: 'org1',
      suggestionKey: 'risky:medical',
      decision: 'accepted',
      decidedBy: 'user1',
      policyId: 'policy2',
    });
    expect(ok).toBe(true);
    expect(calls.find((c) => c.method === 'from')?.args).toEqual(['rule_suggestion_decision']);
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual({
      org_id: 'org1',
      suggestion_key: 'risky:medical',
      decision: 'accepted',
      decided_by: 'user1',
      policy_id: 'policy2',
    });
  });

  it('stores a null policy for a dismissal', async () => {
    mockResult.mockReturnValue({ error: null });
    await recordSuggestionDecision({
      orgId: 'org1',
      suggestionKey: 'pii:us_ssn',
      decision: 'dismissed',
      decidedBy: 'user1',
    });
    expect(
      (calls.find((c) => c.method === 'insert')?.args[0] as { policy_id: unknown }).policy_id,
    ).toBeNull();
  });

  it('returns false on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResult.mockReturnValue({ error: { message: 'boom' } });
    expect(
      await recordSuggestionDecision({
        orgId: 'org1',
        suggestionKey: 'pii:us_ssn',
        decision: 'dismissed',
        decidedBy: 'user1',
      }),
    ).toBe(false);
  });
});
