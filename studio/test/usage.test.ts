import { describe, it, expect } from 'vitest';
import {
  usageViewState,
  totalsByType,
  bucketByWeek,
  safetyNetSummary,
  windowStart,
} from '@/lib/domain/usage';
import type { RunSummary } from '@/lib/data/usage';

function run(partial: Partial<RunSummary> = {}): RunSummary {
  return {
    status: 'completed',
    createdAt: '2026-11-16T12:00:00.000Z',
    skillName: 'Draft a thank-you',
    ...partial,
  };
}

describe('usageViewState (Registry view state mapping)', () => {
  it('maps a read failure (null) to error — distinct from empty', () => {
    expect(usageViewState(null)).toBe('error');
  });
  it('maps zero runs to empty', () => {
    expect(usageViewState(0)).toBe('empty');
  });
  it('maps one or more runs to active', () => {
    expect(usageViewState(1)).toBe('active');
    expect(usageViewState(42)).toBe('active');
  });
  it('treats a negative/invalid count as empty, never active', () => {
    expect(usageViewState(-1)).toBe('empty');
  });
});

describe('totalsByType', () => {
  it('counts runs by Skill name, most-used first', () => {
    const totals = totalsByType([
      run({ skillName: 'Thank-you' }),
      run({ skillName: 'Thank-you' }),
      run({ skillName: 'Newsletter' }),
    ]);
    expect(totals).toEqual([
      { name: 'Thank-you', count: 2 },
      { name: 'Newsletter', count: 1 },
    ]);
  });
  it('breaks ties alphabetically', () => {
    const totals = totalsByType([run({ skillName: 'Beta' }), run({ skillName: 'Alpha' })]);
    expect(totals.map((t) => t.name)).toEqual(['Alpha', 'Beta']);
  });
  it('returns [] for no runs', () => {
    expect(totalsByType([])).toEqual([]);
  });
});

describe('safetyNetSummary', () => {
  it('maps each status to its outcome bucket', () => {
    const s = safetyNetSummary([
      run({ status: 'completed' }),
      run({ status: 'approved' }),
      run({ status: 'needs_review' }),
      run({ status: 'blocked' }),
      run({ status: 'rejected' }),
      run({ status: 'running' }),
    ]);
    expect(s).toEqual({
      cleared: 2,
      needsReview: 1,
      blocked: 1,
      rejected: 1,
      inProgress: 1,
      total: 6,
    });
  });
});

describe('bucketByWeek', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  it('produces `weeks` buckets, newest first, labelled relative to now', () => {
    const buckets = bucketByWeek([], now, 5);
    expect(buckets).toHaveLength(5);
    expect(buckets.map((b) => b.label)).toEqual([
      'This week',
      'Last week',
      '2 weeks ago',
      '3 weeks ago',
      '4 weeks ago',
    ]);
  });

  it('places runs in the right week and ignores runs older than the window', () => {
    const buckets = bucketByWeek(
      [
        run({ createdAt: '2026-11-15T12:00:00.000Z' }), // ~1 day ago -> this week
        run({ createdAt: '2026-11-08T12:00:00.000Z' }), // ~8 days ago -> last week
        run({ createdAt: '2026-10-01T12:00:00.000Z' }), // >35 days ago -> no bucket
      ],
      now,
      5,
    );
    expect(buckets[0].count).toBe(1);
    expect(buckets[1].count).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(2);
  });
});

describe('windowStart', () => {
  it('returns `weeks` * 7 days before now', () => {
    const now = new Date('2026-11-16T00:00:00.000Z');
    expect(windowStart(now, 5).toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });
});
