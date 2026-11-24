/**
 * Wording for "something is waiting for review" (Domain layer, ADR-0003) — card "Tell leaders when
 * something is waiting for their review". Pure: no I/O, and `now` is passed in so tests are exact.
 *
 * The human-approval gate (ADR-0020/0028) only works if someone notices there's something to decide,
 * so the count appears on Home and in the menu, for everyone who can review (any org member, Val
 * 2026-11-24). Counts are always words, never a colored dot alone.
 */

/** What the layout gets: how many runs wait for review and when the oldest was flagged. */
export type PendingReviewsSummary = { count: number; oldestCreatedAt: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days since `iso` (never negative; a bad date counts as 0). */
export function daysSince(iso: string, now: Date): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

/** How long one item has been waiting: "Flagged today", "Waiting 1 day", "Waiting 6 days". */
export function waitingAge(iso: string, now: Date): string {
  const days = daysSince(iso, now);
  if (days === 0) return 'Flagged today';
  return `Waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * The Home line, or null when nothing is waiting: e.g. "3 waiting for your review" plus
 * "oldest 6 days" (or "flagged today").
 */
export function waitingHeadline(
  summary: PendingReviewsSummary,
  now: Date,
): { headline: string; age: string | null } | null {
  if (summary.count <= 0) return null;
  const days = summary.oldestCreatedAt ? daysSince(summary.oldestCreatedAt, now) : null;
  const age =
    days === null
      ? null
      : days === 0
        ? 'flagged today'
        : `oldest ${days} ${days === 1 ? 'day' : 'days'}`;
  return { headline: `${summary.count} waiting for your review`, age };
}

/** A visible menu label with its count: "Human Review (3)"; unchanged when nothing is waiting. */
export function labelWithCount(label: string, count: number): string {
  return count > 0 ? `${label} (${count})` : label;
}

/** What a screen reader hears for a menu control: "Your AI Governance, 3 waiting for review". */
export function accessibleLabelWithCount(label: string, count: number): string {
  return count > 0 ? `${label}, ${count} waiting for review` : label;
}
