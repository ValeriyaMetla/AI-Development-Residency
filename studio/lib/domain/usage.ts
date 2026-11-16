import type { RunSummary, TaskStatus } from '@/lib/data/usage';

/**
 * Pure aggregation + presentation-state logic for the Registry view (Chunk 3, Domain layer,
 * ADR-0003). No I/O, no framework — unit-testable in isolation. Depends only on the Data-layer
 * read shape (RunSummary); the dependency points downward (Domain -> Data-Source), and the
 * import is type-only, so no Supabase/SDK reaches this layer (Leak Test holds).
 *
 * Everything here reduces runs to COUNTS. No run content is read or produced.
 */

export type UsageViewState = 'error' | 'empty' | 'active';

/**
 * Maps the all-time run count (or `null` for a read failure) to the one state the Usage view
 * should render, so "no activity yet" and "we couldn't load it" never collapse into one branch.
 * A negative/invalid count is treated as empty, never as activity.
 */
export function usageViewState(runCount: number | null): UsageViewState {
  if (runCount === null) return 'error';
  if (runCount <= 0) return 'empty';
  return 'active';
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Start of the rolling window: `weeks` * 7 days before `now`. */
export function windowStart(now: Date, weeks: number): Date {
  return new Date(now.getTime() - weeks * WEEK_MS);
}

export type TypeTotal = { name: string; count: number };

/** Run counts grouped by task type (Skill name), most-used first; ties broken alphabetically. */
export function totalsByType(runs: RunSummary[]): TypeTotal[] {
  const counts = new Map<string, number>();
  for (const r of runs) counts.set(r.skillName, (counts.get(r.skillName) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type WeekBucket = { label: string; startIso: string; count: number };

/**
 * Run counts bucketed into `weeks` rolling 7-day windows ending at `now`, newest first.
 * Half-open buckets (start, end] so a run is counted once. Runs older than the window
 * (before windowStart) fall into no bucket.
 */
export function bucketByWeek(runs: RunSummary[], now: Date, weeks: number): WeekBucket[] {
  const nowMs = now.getTime();
  const buckets: WeekBucket[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(nowMs - (i + 1) * WEEK_MS);
    buckets.push({ label: weekLabel(i), startIso: start.toISOString(), count: 0 });
  }
  for (const r of runs) {
    const t = new Date(r.createdAt).getTime();
    if (Number.isNaN(t)) continue;
    for (let i = 0; i < weeks; i++) {
      const endMs = nowMs - i * WEEK_MS;
      const startMs = endMs - WEEK_MS;
      if (t > startMs && t <= endMs) {
        buckets[i].count += 1;
        break;
      }
    }
  }
  return buckets;
}

function weekLabel(i: number): string {
  if (i === 0) return 'This week';
  if (i === 1) return 'Last week';
  return `${i} weeks ago`;
}

/**
 * Plain-language outcome for a single run's status, for the per-run "my entries" rows.
 * Text carries the meaning (never color alone), and it names what the safety net did.
 */
export function outcomeLabel(status: TaskStatus): string {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'Completed';
    case 'needs_review':
      return 'Needed review';
    case 'blocked':
      return 'Blocked by a rule';
    case 'rejected':
      return 'Rejected on review';
    case 'running':
      return 'In progress';
  }
}

export type SafetyNetSummary = {
  cleared: number;
  needsReview: number;
  blocked: number;
  rejected: number;
  inProgress: number;
  total: number;
};

/**
 * The safety-net outcome counts, derived from task_run.status (which already reflects the
 * pipeline's guardrail decisions: a guardrail block -> blocked, a self-critique revise -> needs
 * review). Shows the Leader that governance acted, without any run content.
 */
export function safetyNetSummary(runs: RunSummary[]): SafetyNetSummary {
  const s: SafetyNetSummary = {
    cleared: 0,
    needsReview: 0,
    blocked: 0,
    rejected: 0,
    inProgress: 0,
    total: runs.length,
  };
  for (const r of runs) {
    switch (r.status) {
      case 'completed':
      case 'approved':
        s.cleared += 1;
        break;
      case 'needs_review':
        s.needsReview += 1;
        break;
      case 'blocked':
        s.blocked += 1;
        break;
      case 'rejected':
        s.rejected += 1;
        break;
      case 'running':
        s.inProgress += 1;
        break;
    }
  }
  return s;
}
