import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RunSummary } from '@/lib/data/usage';

// Mock the Supabase server client per table, so `getSummaryInputs` can be tested without a live
// database: awaiting any query chain on a table resolves to that table's queued result.
const results: Record<string, { data: unknown; error: { message: string } | null }> = {};
const mockUser = vi.fn();

vi.mock('@/lib/data/supabase/server', () => {
  const builderFor = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'maybeSingle', 'in', 'range']) {
      builder[m] = () => builder;
    }
    builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(results[table] ?? { data: null, error: null }).then(resolve, reject);
    return builder;
  };
  const client = { from: (table: string) => builderFor(table) };
  return { createClient: () => Promise.resolve(client), getCurrentUser: () => mockUser() };
});

// The all-time run read is the usage reader (reused, not duplicated) — mocked at its boundary.
const mockRuns = vi.fn<() => Promise<RunSummary[] | null>>();
vi.mock('@/lib/data/usage', () => ({ getRunSummariesSince: () => mockRuns() }));

import { getSummaryInputs } from '@/lib/data/report';

const run = (status: RunSummary['status'], createdAt: string): RunSummary => ({
  status,
  createdAt,
  skillName: 'Draft a grant summary',
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockUser.mockResolvedValue({ id: 'u1' });
  // Newest first, as the usage reader returns them.
  mockRuns.mockResolvedValue([
    run('completed', '2026-11-18T00:00:00Z'),
    run('needs_review', '2026-11-10T00:00:00Z'),
    run('blocked', '2026-11-03T00:00:00Z'),
  ]);
  results.approval = {
    // Two decision rows on the same run must count once.
    data: [{ task_run_id: 'r1' }, { task_run_id: 'r1' }, { task_run_id: 'r2' }],
    error: null,
  };
  results.policy = {
    data: { name: 'Our AI Policy', created_at: '2026-11-01T00:00:00Z' },
    error: null,
  };
});

describe('getSummaryInputs — the facts behind the funder summary', () => {
  it('returns all-time counts, the earliest activity, distinct reviewed runs, and the policy', async () => {
    const inputs = await getSummaryInputs();
    expect(inputs).not.toBeNull();
    expect(inputs!.safety.total).toBe(3);
    expect(inputs!.safety.cleared).toBe(1);
    expect(inputs!.safety.needsReview).toBe(1);
    expect(inputs!.safety.blocked).toBe(1);
    expect(inputs!.firstActivityAt).toBe('2026-11-03T00:00:00Z');
    expect(inputs!.humanReviewedCount).toBe(2);
    expect(inputs!.policy).toEqual({ name: 'Our AI Policy', activeSince: '2026-11-01T00:00:00Z' });
  });

  it('reports genuinely no active policy as null (baseline safety only)', async () => {
    results.policy = { data: null, error: null };
    const inputs = await getSummaryInputs();
    expect(inputs).not.toBeNull();
    expect(inputs!.policy).toBeNull();
  });

  it('reports no activity honestly: zero counts and no invented first date', async () => {
    mockRuns.mockResolvedValue([]);
    results.approval = { data: [], error: null };
    const inputs = await getSummaryInputs();
    expect(inputs!.safety.total).toBe(0);
    expect(inputs!.firstActivityAt).toBeNull();
    expect(inputs!.humanReviewedCount).toBe(0);
  });
});

describe('getSummaryInputs — a failure is never printed as a fact', () => {
  it('a failed POLICY read is null overall — never "no active policy"', async () => {
    results.policy = { data: null, error: { message: 'boom' } };
    expect(await getSummaryInputs()).toBeNull();
  });

  it('a failed approvals read is null overall — never "0 reviewed"', async () => {
    results.approval = { data: null, error: { message: 'boom' } };
    expect(await getSummaryInputs()).toBeNull();
  });

  it('a failed run read is null overall — never "no activity"', async () => {
    mockRuns.mockResolvedValue(null);
    expect(await getSummaryInputs()).toBeNull();
  });

  it('signed out is null — nothing is read', async () => {
    mockUser.mockResolvedValue(null);
    expect(await getSummaryInputs()).toBeNull();
  });
});
