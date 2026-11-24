import { beforeEach, describe, expect, it, vi } from 'vitest';

// Card "Tell leaders when something is waiting for their review": the wording helpers (pure) and the
// count read (mocked database, as in policy.test.ts: every builder method returns the builder, and
// awaiting it resolves mockResult()).

const mockResult = vi.fn();
const calls: [string, unknown[]][] = [];

vi.mock('@/lib/data/supabase/server', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockResult()).then(resolve, reject);
  return { createClient: () => Promise.resolve({ from: () => builder }) };
});

import { countPendingReviews } from '@/lib/data/runs';
import {
  accessibleLabelWithCount,
  daysSince,
  labelWithCount,
  waitingAge,
  waitingHeadline,
} from '@/lib/domain/review-waiting';

const NOW = new Date('2026-11-24T12:00:00Z');

describe('waiting wording', () => {
  it('counts whole days, never negative, and treats a bad date as 0', () => {
    expect(daysSince('2026-11-18T09:00:00Z', NOW)).toBe(6);
    expect(daysSince('2026-11-25T09:00:00Z', NOW)).toBe(0);
    expect(daysSince('not a date', NOW)).toBe(0);
  });

  it.each([
    ['2026-11-24T08:00:00Z', 'Flagged today'],
    ['2026-11-23T08:00:00Z', 'Waiting 1 day'],
    ['2026-11-18T08:00:00Z', 'Waiting 6 days'],
  ])('an item flagged %s reads "%s"', (iso, expected) => {
    expect(waitingAge(iso, NOW)).toBe(expected);
  });

  it('gives the Home line with the oldest age, and nothing when none are waiting', () => {
    expect(waitingHeadline({ count: 3, oldestCreatedAt: '2026-11-18T08:00:00Z' }, NOW)).toEqual({
      headline: '3 waiting for your review',
      age: 'oldest 6 days',
    });
    expect(waitingHeadline({ count: 1, oldestCreatedAt: '2026-11-24T08:00:00Z' }, NOW)?.age).toBe(
      'flagged today',
    );
    expect(waitingHeadline({ count: 0, oldestCreatedAt: null }, NOW)).toBeNull();
  });

  it('shows the count in words in the menu, and tells screen readers what it means', () => {
    expect(labelWithCount('Human Review', 3)).toBe('Human Review (3)');
    expect(labelWithCount('Human Review', 0)).toBe('Human Review');
    expect(accessibleLabelWithCount('Your AI Governance', 3)).toBe(
      'Your AI Governance, 3 waiting for review',
    );
    expect(accessibleLabelWithCount('Account menu', 0)).toBe('Account menu');
  });
});

describe('countPendingReviews', () => {
  beforeEach(() => {
    mockResult.mockReset();
    calls.length = 0;
  });

  it('counts only waiting runs (org-scoped by RLS) and reads the oldest one', async () => {
    mockResult.mockReturnValue({
      data: [{ created_at: '2026-11-18T08:00:00Z' }],
      count: 4,
      error: null,
    });
    expect(await countPendingReviews()).toEqual({
      count: 4,
      oldestCreatedAt: '2026-11-18T08:00:00Z',
    });
    expect(calls).toContainEqual(['select', ['created_at', { count: 'exact' }]]);
    expect(calls).toContainEqual(['eq', ['status', 'needs_review']]);
    expect(calls).toContainEqual(['order', ['created_at', { ascending: true }]]);
    expect(calls).toContainEqual(['limit', [1]]);
  });

  it('returns zero with no oldest when nothing is waiting', async () => {
    mockResult.mockReturnValue({ data: [], count: 0, error: null });
    expect(await countPendingReviews()).toEqual({ count: 0, oldestCreatedAt: null });
  });

  it('returns null on an error, so the count is hidden rather than breaking the page', async () => {
    mockResult.mockReturnValue({ data: null, count: null, error: { message: 'boom' } });
    expect(await countPendingReviews()).toBeNull();
  });
});
