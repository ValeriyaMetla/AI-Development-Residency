import { describe, it, expect } from 'vitest';
import {
  detectPatterns,
  signalKeys,
  suggestionWindowStart,
  SUGGESTION_MIN_RUNS,
  SUGGESTION_WINDOW_DAYS,
} from '@/lib/domain/rule-suggestions';
import type { SignalEvent } from '@/lib/data/suggestions';

/**
 * Detect recurring patterns from the registry (Epic 2 · Rule suggestions · Chunk 4; ADR-0025).
 * Card AC: Given repeated use of a type above the threshold, When detection runs, Then that type is
 * flagged as a pattern candidate. Pure tests over fixture registries — no I/O.
 */

const NOW = new Date('2026-11-18T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY).toISOString();

function risky(run: string, patterns: unknown, at = daysAgo(1)): SignalEvent {
  return { taskRunId: run, eventType: 'risky_use_flagged', payload: { patterns }, createdAt: at };
}
function pii(
  run: string,
  categories: unknown,
  type: 'pii_stripped' | 'pii_kept' = 'pii_stripped',
  at = daysAgo(1),
): SignalEvent {
  return { taskRunId: run, eventType: type, payload: { categories }, createdAt: at };
}

describe('detectPatterns — threshold (card AC)', () => {
  it('flags a use type seen in 3 distinct runs as a pattern candidate', () => {
    const events = [risky('r1', ['medical']), risky('r2', ['medical']), risky('r3', ['medical'])];
    expect(detectPatterns(events, NOW)).toEqual([
      { key: 'risky:medical', count: 3, windowDays: SUGGESTION_WINDOW_DAYS },
    ]);
  });

  it('does not flag a use type seen in only 2 runs', () => {
    const events = [risky('r1', ['legal']), risky('r2', ['legal'])];
    expect(detectPatterns(events, NOW)).toEqual([]);
  });

  it('uses the documented constants (3 runs, 30 days)', () => {
    expect(SUGGESTION_MIN_RUNS).toBe(3);
    expect(SUGGESTION_WINDOW_DAYS).toBe(30);
  });
});

describe('detectPatterns — the 30-day window', () => {
  it('ignores a run older than the window', () => {
    const events = [
      pii('r1', ['us_ssn']),
      pii('r2', ['us_ssn']),
      pii('r3', ['us_ssn'], 'pii_stripped', daysAgo(31)),
    ];
    expect(detectPatterns(events, NOW)).toEqual([]);
  });

  it('counts a run exactly at the window start', () => {
    const start = suggestionWindowStart(NOW).toISOString();
    const events = [
      pii('r1', ['us_ssn']),
      pii('r2', ['us_ssn']),
      pii('r3', ['us_ssn'], 'pii_stripped', start),
    ];
    expect(detectPatterns(events, NOW)).toHaveLength(1);
  });

  it('ignores an event dated in the future or with an unreadable date', () => {
    const future = new Date(NOW.getTime() + DAY).toISOString();
    const events = [
      risky('r1', ['medical']),
      risky('r2', ['medical']),
      risky('r3', ['medical'], future),
      risky('r4', ['medical'], 'not-a-date'),
    ];
    expect(detectPatterns(events, NOW)).toEqual([]);
  });
});

describe('detectPatterns — distinct runs', () => {
  it('counts a category both stripped and kept in one run only once', () => {
    const events = [
      pii('r1', ['credit_card'], 'pii_stripped'),
      pii('r1', ['credit_card'], 'pii_kept'),
      pii('r2', ['credit_card']),
    ];
    expect(detectPatterns(events, NOW)).toEqual([]); // 2 distinct runs, not 3
  });

  it('counts one run toward every pattern it fired', () => {
    const events = ['r1', 'r2', 'r3'].map((r) => risky(r, ['medical', 'legal']));
    expect(detectPatterns(events, NOW).map((p) => p.key)).toEqual(['risky:legal', 'risky:medical']);
  });

  it('skips events with no run id (cannot be counted distinctly)', () => {
    const events = [
      risky('r1', ['medical']),
      risky('r2', ['medical']),
      { ...risky('x', ['medical']), taskRunId: null },
    ];
    expect(detectPatterns(events, NOW)).toEqual([]);
  });

  it('sorts most frequent first, then by key', () => {
    const events = [
      ...['a', 'b', 'c', 'd'].map((r) => pii(r, ['us_ssn'])),
      ...['a', 'b', 'c'].map((r) => risky(r, ['medical'])),
      ...['a', 'b', 'c'].map((r) => risky(r, ['legal'])),
    ];
    expect(detectPatterns(events, NOW).map((p) => p.key)).toEqual([
      'pii:us_ssn',
      'risky:legal',
      'risky:medical',
    ]);
  });
});

describe('signalKeys — payload parsed as untrusted', () => {
  it('maps risky-use ids and PII categories to prefixed keys', () => {
    expect(signalKeys(risky('r', ['medical']))).toEqual(['risky:medical']);
    expect(signalKeys(pii('r', ['us_ssn']))).toEqual(['pii:us_ssn']);
  });

  it('yields nothing for the legacy empty payload written before ADR-0025', () => {
    expect(signalKeys({ eventType: 'risky_use_flagged', payload: {} })).toEqual([]);
  });

  it('ignores malformed payloads and unsafe values instead of erroring', () => {
    expect(signalKeys({ eventType: 'pii_stripped', payload: null })).toEqual([]);
    expect(signalKeys({ eventType: 'pii_stripped', payload: 'us_ssn' })).toEqual([]);
    expect(signalKeys(pii('r', 'us_ssn'))).toEqual([]);
    expect(signalKeys(pii('r', [42, '', 'US SSN', '<script>', 'x'.repeat(41), 'us_ssn']))).toEqual([
      'pii:us_ssn',
    ]);
  });

  it('de-duplicates a repeated id within one event', () => {
    expect(signalKeys(risky('r', ['medical', 'medical']))).toEqual(['risky:medical']);
  });
});

describe('privacy — counts only', () => {
  it('a candidate carries only key, count, and window — no run ids or content', () => {
    const events = ['r1', 'r2', 'r3'].map((r) => risky(r, ['medical']));
    const [candidate] = detectPatterns(events, NOW);
    expect(Object.keys(candidate).sort()).toEqual(['count', 'key', 'windowDays']);
  });
});
