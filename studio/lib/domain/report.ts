/**
 * Audit-trail presentation logic (Domain layer, ADR-0003) for the card
 * "Build the audit trail from registry data" (Epic #7, Lane C).
 *
 * Pure: no I/O, no Supabase, no framework — unit-testable in isolation. It turns the allow-listed,
 * non-sensitive records the Data layer reads (`lib/data/report.ts`) into the plain-language lines the
 * `/report` page shows, and flags runs whose record has a detectable gap (US5).
 *
 * Invariants:
 * - NO content, ever. The wording below uses only non-sensitive, allow-listed detail (category
 *   NAMES, counts, a verdict/tier) — never typed input, drafts, note text or rule text (Build Plan
 *   ADR-6; card non-goal "No content, ever").
 * - NO names. "Who did it" is only "You" / "Another team member" (card 1, open question 1 — profile
 *   reads are own-only; showing names would need a new org-wide read rule).
 * - Every known kind has wording. WORDING is keyed by `AuditEventType`, so a new kind added to
 *   `audit-events.ts` without a line here is a COMPILE error; `report.test.ts` also checks it at
 *   runtime. An unknown kind (e.g. one added by a newer deploy) is shown as "Other recorded event",
 *   never hidden (US1).
 */

import { isAuditEventType, type AuditEventType } from '@/lib/domain/audit-events';

/** Who took the action, resolved by the Data layer as `actor === auth.uid()` — never a name. */
export type TrailActor = 'you' | 'other';

/**
 * Allow-listed, non-sensitive detail the Data layer may attach to an event. Every field here is a
 * category name, a count, or a short enum — never free text a person typed.
 */
export type AuditDetail = {
  /** pii_stripped / pii_kept — category NAMES only (e.g. "email", "phone"), never the values. */
  categories?: string[];
  /** task_completed — the run's terminal outcome. */
  outcome?: 'completed' | 'needs_review';
  /** task_approved — the draft was edited before approval (ADR-0022 human-involvement wording). */
  edited?: boolean;
  /** task_run_corrected — a correction or a note; the note TEXT is never carried (ADR-0021). */
  correctionKind?: 'correction' | 'note';
  /** copilot_assessed — the assessment verdict and risk tier. */
  verdict?: string;
  riskTier?: string;
  /** policy_seeded / policy_edited — how many rules the version has. */
  ruleCount?: number;
};

/** One governed event, normalized by the Data layer to only the fields the trail may display. */
export type AuditRecord = {
  id: string;
  /** Raw `event_type`; may be an unknown kind, shown as "Other recorded event". */
  type: string;
  /** ISO-8601 timestamp (the DB sets it; the view formats it with a time zone). */
  at: string;
  actor: TrailActor;
  taskRunId: string | null;
  detail: AuditDetail;
};

/** Shown verbatim for any event whose kind this build doesn't recognize (US1). */
export const OTHER_EVENT_WORDING = 'Other recorded event';

/** Marker shown against a run whose "finished"/"stopped" entry is missing (US5). */
export const RUN_GAP_MARKER = 'Part of this run’s record is missing';

/** "You" for the signed-in Leader's own actions, "Another team member" otherwise (no names in 1b). */
export function actorLabel(actor: TrailActor): string {
  return actor === 'you' ? 'You' : 'Another team member';
}

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

/** Category names joined for display, with a safe fallback; never the detected values. */
function categoryList(categories: string[] | undefined): string {
  const names = (categories ?? []).map((c) => c.trim()).filter(Boolean);
  return names.length ? names.join(', ') : 'personal details';
}

/**
 * The plain-language line for each known event kind. Keyed by `AuditEventType`, so this object is
 * exhaustive by construction — a new kind in `audit-events.ts` fails to compile until it is added.
 * Wording is the copy Val approved for card 1 (US2).
 */
const WORDING: Record<AuditEventType, (d: AuditDetail) => string> = {
  pii_stripped: (d) =>
    `Personal details removed before the AI saw them — ${categoryList(d.categories)}`,
  pii_kept: (d) => `Personal details kept by the person’s choice — ${categoryList(d.categories)}`,
  risky_use_flagged: () => 'Sent for human review — a sensitive kind of task',
  task_blocked: () => 'Run stopped by a safety check',
  task_completed: (d) =>
    d.outcome === 'needs_review' ? 'Run finished — sent for review' : 'Run finished — completed',
  task_approved: (d) => (d.edited ? 'Edited and approved by a person' : 'Approved by a person'),
  task_rejected: () => 'Rejected by a person',
  task_run_corrected: (d) => (d.correctionKind === 'note' ? 'Note added' : 'Correction added'),
  copilot_assessed: (d) => {
    const parts = [d.verdict, d.riskTier].map((p) => p?.trim()).filter(Boolean);
    return parts.length ? `Co-Pilot assessment — ${parts.join(', ')}` : 'Co-Pilot assessment';
  },
  policy_seeded: (d) =>
    typeof d.ruleCount === 'number' && d.ruleCount >= 0
      ? `AI policy created — ${plural(d.ruleCount, 'rule')}`
      : 'AI policy created',
  policy_edited: (d) =>
    typeof d.ruleCount === 'number' && d.ruleCount >= 0
      ? `AI policy updated — new version with ${plural(d.ruleCount, 'rule')}`
      : 'AI policy updated — new version',
  rule_suggestion_accepted: () => 'Suggested rule accepted — added to the policy as a new version',
  rule_suggestion_dismissed: () => 'Suggested rule dismissed',
};

/** The plain-language line for an event; unknown kinds fall back to "Other recorded event". */
export function eventWording(record: Pick<AuditRecord, 'type' | 'detail'>): string {
  return isAuditEventType(record.type) ? WORDING[record.type](record.detail) : OTHER_EVENT_WORDING;
}

/** A run reduced to what gap detection needs (never any content). */
export type RunForGap = {
  id: string;
  status: 'running' | 'blocked' | 'needs_review' | 'approved' | 'rejected' | 'completed';
};

/** The events that record a run reaching a terminal state ("finished" or "stopped"). */
const TERMINAL_EVENT_TYPES: ReadonlySet<string> = new Set(['task_completed', 'task_blocked']);

/**
 * Run ids whose record has a detectable gap (US5): the run reached a final outcome (any status but
 * `running`) yet has no "finished"/"stopped" audit entry. Conservative on purpose — it only flags
 * gaps it can prove from a missing terminal event, and never claims the record is otherwise complete.
 */
export function detectRunGaps(
  runs: readonly RunForGap[],
  events: readonly Pick<AuditRecord, 'type' | 'taskRunId'>[],
): Set<string> {
  const runsWithTerminalEvent = new Set<string>();
  for (const e of events) {
    if (e.taskRunId && TERMINAL_EVENT_TYPES.has(e.type)) runsWithTerminalEvent.add(e.taskRunId);
  }
  const gapped = new Set<string>();
  for (const run of runs) {
    if (run.status !== 'running' && !runsWithTerminalEvent.has(run.id)) gapped.add(run.id);
  }
  return gapped;
}
