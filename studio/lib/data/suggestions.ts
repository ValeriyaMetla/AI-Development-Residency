import { createClient } from '@/lib/data/supabase/server';

/**
 * Rule-suggestion data-source accessor (Data-Source layer, ADR-0003 / ADR-0025).
 *
 * Reads the registry's audit metadata that rule suggestions are computed from. Read-side only and
 * deliberately narrow: it selects the run id (to count distinct runs), the event type, the payload
 * (pattern ids / PII categories — non-sensitive by design, ADR-6), and the timestamp. It never
 * selects `actor`, so suggestions describe the organization's pattern, not an individual.
 * Runs under the user's JWT, so the org-scoped RLS on `audit_event` applies.
 */

/** The audit events that carry a suggestion signal (ADR-0025 §1). */
export const SIGNAL_EVENT_TYPES = ['risky_use_flagged', 'pii_stripped', 'pii_kept'] as const;
export type SignalEventType = (typeof SIGNAL_EVENT_TYPES)[number];

/** One signal-bearing audit event. `payload` is passed through as-is; the Domain parses it. */
export type SignalEvent = {
  taskRunId: string | null;
  eventType: SignalEventType;
  payload: unknown;
  createdAt: string;
};

type SignalEventRow = {
  task_run_id: string | null;
  event_type: SignalEventType;
  payload: unknown;
  created_at: string;
};

const SIGNAL_EVENT_COLUMNS = 'task_run_id, event_type, payload, created_at';

/** Pure mapper (snake_case -> camelCase), kept separate so it is unit-testable. */
export function mapSignalEventRow(row: SignalEventRow): SignalEvent {
  return {
    taskRunId: row.task_run_id,
    eventType: row.event_type,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

/**
 * The org's signal-bearing audit events created at/after `sinceIso`. Returns `null` on failure so
 * callers can tell "couldn't load" apart from "nothing recurring yet" (ADR-14).
 */
export async function getSuggestionSignalsSince(sinceIso: string): Promise<SignalEvent[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_event')
    .select(SIGNAL_EVENT_COLUMNS)
    .in('event_type', [...SIGNAL_EVENT_TYPES])
    .gte('created_at', sinceIso);
  if (error) {
    console.error('getSuggestionSignalsSince failed:', error.message);
    return null;
  }
  return ((data as SignalEventRow[] | null) ?? []).map(mapSignalEventRow);
}

/**
 * The suggestion keys the org has already decided on (accepted or dismissed) — the dedup memory
 * (ADR-0025 §4). Selects only the key, never who decided. RLS scopes it to the caller's org.
 * Returns `null` on failure, so the caller can fail closed instead of re-surfacing a dismissal.
 */
export async function getSuggestionDecisionKeys(): Promise<Set<string> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('rule_suggestion_decision').select('suggestion_key');
  if (error) {
    console.error('getSuggestionDecisionKeys failed:', error.message);
    return null;
  }
  return new Set(
    ((data as { suggestion_key: string }[] | null) ?? []).map((row) => row.suggestion_key),
  );
}
