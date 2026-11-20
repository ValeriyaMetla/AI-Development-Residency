import type { SafetyNetSummary } from '@/lib/domain/usage';
import { AUDIT_PROTECTION_STATEMENT } from '@/lib/domain/audit-events';

/**
 * Governed-AI summary composer (Domain layer, ADR-0003) — card "Handle low-data honestly in the
 * summary" (Epic #7, Lane C). The honest, templated recap the `/report` export (card "Build
 * one-click responsible-AI summary export") renders and prints.
 *
 * TEMPLATED FROM DATA, NEVER MODEL-WRITTEN (no fabrication, no cost, provable). Pure: no I/O, no
 * framework — unit-testable in isolation. Its whole job is honesty under thin data:
 *   - the sample size + period are ALWAYS stated, so no figure floats without its base;
 *   - empty and low activity are first-class states with their own wording, never blanks/errors;
 *   - NO overstatement — percentages appear only above a minimum base, and no template uses
 *     absolute/temporal claims ("every", "consistently", "always") a handful of events can't support.
 */

/** Fewer than this many governed actions → the "early use" caveat. */
export const LOW_DATA_MAX_ACTIONS = 5;
/** First activity within this many days of the report → the "early use" caveat. */
export const LOW_DATA_RECENCY_DAYS = 14;
/** A derived percentage is shown only when the base is at least this many actions. */
export const PERCENT_FLOOR = 10;

export type SummaryState = 'empty' | 'low' | 'normal';

/** One oversight figure: a raw count, and a percentage ONLY when the base clears the floor. */
export type SummaryStat = { label: string; count: number; percent: number | null };

export type GovernedAISummary = {
  state: SummaryState;
  orgName: string;
  /** ISO — the Presentation layer formats dates (keeps this composer format-free and testable). */
  generatedAt: string;
  periodLabel: string;
  headline: string;
  /** Always present: states the base the summary is built on. */
  sampleSize: string;
  /** The honest low-data caveat, or null. */
  caveat: string | null;
  /** Oversight breakdown as raw counts (+ % above the floor). Empty for the empty state. */
  stats: SummaryStat[];
  /** Human-involvement figure (ADR-0022), or null when there is no activity. */
  humanReviewed: SummaryStat | null;
  /** The policy in force; null → baseline safety only. `activeSince` is ISO (the UI formats it). */
  policy: { name: string; activeSince: string } | null;
  protection: string;
};

export type SummaryInput = {
  orgName: string | null;
  /** ISO timestamp the report was generated (used for the recency check). */
  generatedAt: string;
  periodLabel: string;
  safety: SafetyNetSummary;
  /** ISO of the earliest recorded activity, or null when there is none. */
  firstActivityAt: string | null;
  /** How many outputs a person reviewed or edited (ADR-0022). */
  humanReviewedCount: number;
  policy: { name: string; activeSince: string } | null;
};

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

/** A percentage only when the base clears the floor — never on a small (or zero) base. */
function percentOf(count: number, total: number): number | null {
  if (total < PERCENT_FLOOR || total <= 0) return null;
  return Math.round((count / total) * 100);
}

function withinDays(fromIso: string | null, toIso: string, days: number): boolean {
  if (!fromIso) return false;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return false;
  return to - from <= days * 24 * 60 * 60 * 1000 && to >= from;
}

/**
 * Compose the honest summary from counts. The state decides the wording: `empty` (no activity),
 * `low` (few actions or only-recent use — adds the caveat, never a percentage), or `normal`.
 */
export function composeSummary(input: SummaryInput): GovernedAISummary {
  const total = Math.max(0, Math.trunc(input.safety.total));
  const orgName = input.orgName?.trim() || 'Your organization';

  const common = {
    orgName,
    generatedAt: input.generatedAt,
    periodLabel: input.periodLabel,
    policy: input.policy,
    protection: AUDIT_PROTECTION_STATEMENT,
  };

  if (total <= 0) {
    return {
      ...common,
      state: 'empty',
      headline: 'No governed AI activity has been recorded yet.',
      sampleSize: `No governed actions recorded over ${input.periodLabel}.`,
      caveat: null,
      stats: [],
      humanReviewed: null,
    };
  }

  const isLow =
    total < LOW_DATA_MAX_ACTIONS ||
    withinDays(input.firstActivityAt, input.generatedAt, LOW_DATA_RECENCY_DAYS);

  const stat = (label: string, count: number): SummaryStat => ({
    label,
    count: Math.max(0, Math.trunc(count)),
    percent: percentOf(count, total),
  });

  return {
    ...common,
    state: isLow ? 'low' : 'normal',
    headline: `${plural(total, 'governed action')} ran through the safety net.`,
    sampleSize: `Based on ${plural(total, 'governed action')} over ${input.periodLabel}.`,
    caveat: isLow ? 'This reflects early use — a small amount of activity so far.' : null,
    stats: [
      stat('Completed', input.safety.cleared),
      stat('Sent for human review', input.safety.needsReview),
      stat('Stopped by a safety check', input.safety.blocked),
      stat('Rejected on review', input.safety.rejected),
      stat('In progress', input.safety.inProgress),
    ],
    humanReviewed: stat('Reviewed by a person', input.humanReviewedCount),
  };
}
