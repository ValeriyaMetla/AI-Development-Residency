/**
 * Read-only demo views (ADR-0029 T6). PURE: no I/O, no model call, no session.
 *
 * Builds the demo's policy, review and record sections with the product's REAL Domain code, so
 * the demo shows exactly what the product shows: the policy document from `buildPolicyDocument`
 * and each record line from `eventWording`. The page renders these results and decides nothing.
 */
import { buildPolicyDocument, type PolicyDocument } from '@/lib/domain/policy-document';
import { eventWording } from '@/lib/domain/report';
import { allDemoRuns, type DemoRun } from '@/lib/demo/demo-run';
import {
  SAMPLE_ORG,
  SAMPLE_POLICY,
  SAMPLE_PRESETS,
  SAMPLE_RULES,
  SAMPLE_TRAIL,
} from '@/lib/demo/sample-org';

/** The sample policy as the real policy document builder lays it out. */
export function buildDemoPolicy(): PolicyDocument {
  return buildPolicyDocument({
    orgName: SAMPLE_ORG.name,
    versionCreatedAt: SAMPLE_POLICY.createdAt,
    rules: SAMPLE_RULES,
  });
}

/** The one sample run waiting for a person's decision (the run the real rule-check flagged). */
export function demoPendingReview(): DemoRun | null {
  return allDemoRuns().find((r) => r.outcome.status === 'needs_review') ?? null;
}

export type DemoRecordLine = {
  id: string;
  /** ISO time, for a `<time dateTime>` attribute. */
  at: string;
  /** Fixed, readable date, e.g. "10 November 2026" (UTC, so it never shifts by time zone). */
  dateLabel: string;
  /** The real product's wording for this kind of event. */
  wording: string;
  /** Which sample run the entry belongs to, or null for org-wide entries (the policy). */
  runLabel: string | null;
};

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** The sample record, oldest first, each line in the real product's wording. */
export function buildDemoRecord(): DemoRecordLine[] {
  const runLabels = new Map(SAMPLE_PRESETS.map((p) => [p.taskRunId, p.label]));
  return SAMPLE_TRAIL.map((e) => ({
    id: e.id,
    at: e.at,
    dateLabel: DATE.format(new Date(e.at)),
    wording: eventWording(e),
    runLabel: e.taskRunId ? (runLabels.get(e.taskRunId) ?? null) : null,
  }));
}
