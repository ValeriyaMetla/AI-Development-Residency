import type { SignalEvent } from '@/lib/data/suggestions';

/**
 * Rule suggestions — PURE logic (Domain layer, ADR-0003 / ADR-0025; spec:
 * docs/specs/epic-1-rule-suggestion-logic.md). No I/O and no model call: deterministic and
 * inspectable, so a leader can see exactly why a suggestion appeared (a key, a count, a window).
 * The data import is type-only, so nothing from Supabase reaches this layer (Leak Test holds).
 *
 * This module grows across the feature's cards:
 *   - Detect recurring patterns (this card): signal keys -> distinct-run counts -> threshold.
 *   - Surface candidate suggestions (dedup): catalog wording + recorded-decision dedup (next card).
 *
 * Output carries counts only — never run content and never who ran a task.
 */

/** Rolling window the registry is counted over (spec §4). */
export const SUGGESTION_WINDOW_DAYS = 30;
/** Distinct runs in the window that make a key a pattern candidate (spec §4). */
export const SUGGESTION_MIN_RUNS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the counting window ending at `now`. */
export function suggestionWindowStart(now: Date): Date {
  return new Date(now.getTime() - SUGGESTION_WINDOW_DAYS * DAY_MS);
}

/** A recurring use type over the threshold — the input to the surfacing/dedup step. */
export type PatternCandidate = { key: string; count: number; windowDays: number };

// Ids/categories come from our own detectors, but the payload is stored data, so it is parsed as
// untrusted: only short lowercase identifiers become keys.
const SAFE_ID = /^[a-z0-9_-]{1,40}$/;

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && SAFE_ID.test(v));
}

/**
 * The suggestion keys one audit event carries: `risky:<pattern id>` for risky-use events,
 * `pii:<category>` for PII events. A malformed or legacy payload (e.g. the pre-ADR-0025 `{}`)
 * yields no keys rather than an error.
 */
export function signalKeys(event: Pick<SignalEvent, 'eventType' | 'payload'>): string[] {
  const payload = event.payload;
  if (typeof payload !== 'object' || payload === null) return [];
  const fields = payload as Record<string, unknown>;
  const keys =
    event.eventType === 'risky_use_flagged'
      ? stringIds(fields.patterns).map((id) => `risky:${id}`)
      : stringIds(fields.categories).map((c) => `pii:${c}`);
  return [...new Set(keys)];
}

/**
 * Detect recurring use types: count DISTINCT runs per key inside the window ending at `now`, and
 * keep keys with at least SUGGESTION_MIN_RUNS. A run counts once per key even if several events
 * carry it (e.g. a category both stripped and kept). Events with no run id cannot be counted
 * distinctly and are skipped. Sorted most-frequent first, then by key, so output is stable.
 */
export function detectPatterns(events: SignalEvent[], now: Date): PatternCandidate[] {
  const start = suggestionWindowStart(now).getTime();
  const end = now.getTime();
  const runsByKey = new Map<string, Set<string>>();

  for (const event of events) {
    if (!event.taskRunId) continue;
    const at = Date.parse(event.createdAt);
    if (Number.isNaN(at) || at < start || at > end) continue;
    for (const key of signalKeys(event)) {
      const runs = runsByKey.get(key) ?? new Set<string>();
      runs.add(event.taskRunId);
      runsByKey.set(key, runs);
    }
  }

  return [...runsByKey.entries()]
    .filter(([, runs]) => runs.size >= SUGGESTION_MIN_RUNS)
    .map(([key, runs]) => ({ key, count: runs.size, windowDays: SUGGESTION_WINDOW_DAYS }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
