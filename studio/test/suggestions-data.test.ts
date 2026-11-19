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
  for (const m of ['select', 'in', 'gte']) {
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
