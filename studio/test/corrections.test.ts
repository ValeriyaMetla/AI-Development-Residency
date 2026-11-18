import { describe, it, expect } from 'vitest';
import {
  parseCorrectionInput,
  correctionsByRun,
  kindLabel,
  CORRECTION_KINDS,
  MAX_CORRECTION_NOTE,
  type CorrectionEntry,
} from '@/lib/domain/corrections';

/**
 * Domain tests for the entry-correction / note flow (ADR-0021). Pure logic only — the untrusted
 * payload parser (the write gate) and the display grouping. Data writes + RLS are exercised by the
 * migration, not here.
 */

describe('parseCorrectionInput', () => {
  const base = { taskRunId: 'run-1', kind: 'note', note: 'Looks right.' };

  it('accepts a valid note', () => {
    const r = parseCorrectionInput(base);
    expect(r).toEqual({ ok: true, taskRunId: 'run-1', kind: 'note', note: 'Looks right.' });
  });

  it('accepts a valid correction', () => {
    const r = parseCorrectionInput({ ...base, kind: 'correction', note: 'This was mislabeled.' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe('correction');
  });

  it('trims the note', () => {
    const r = parseCorrectionInput({ ...base, note: '  spaced  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.note).toBe('spaced');
  });

  it('trims the run id', () => {
    const r = parseCorrectionInput({ ...base, taskRunId: '  run-7  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.taskRunId).toBe('run-7');
  });

  it('rejects a non-object payload', () => {
    expect(parseCorrectionInput(null).ok).toBe(false);
    expect(parseCorrectionInput('nope').ok).toBe(false);
    expect(parseCorrectionInput(42).ok).toBe(false);
  });

  it('rejects a missing or blank run id', () => {
    expect(parseCorrectionInput({ ...base, taskRunId: '' }).ok).toBe(false);
    expect(parseCorrectionInput({ ...base, taskRunId: '   ' }).ok).toBe(false);
    expect(parseCorrectionInput({ kind: 'note', note: 'x' }).ok).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(parseCorrectionInput({ ...base, kind: 'edit' }).ok).toBe(false);
    expect(parseCorrectionInput({ ...base, kind: '' }).ok).toBe(false);
    expect(parseCorrectionInput({ taskRunId: 'run-1', note: 'x' }).ok).toBe(false);
  });

  it('requires a non-empty note (no empty correction)', () => {
    expect(parseCorrectionInput({ ...base, note: '' }).ok).toBe(false);
    expect(parseCorrectionInput({ ...base, note: '   ' }).ok).toBe(false);
    expect(parseCorrectionInput({ taskRunId: 'run-1', kind: 'note' }).ok).toBe(false);
  });

  it('rejects a non-string note', () => {
    expect(parseCorrectionInput({ ...base, note: 123 }).ok).toBe(false);
  });

  it('rejects an over-long note but accepts one at the cap', () => {
    const atCap = 'a'.repeat(MAX_CORRECTION_NOTE);
    const overCap = 'a'.repeat(MAX_CORRECTION_NOTE + 1);
    expect(parseCorrectionInput({ ...base, note: atCap }).ok).toBe(true);
    expect(parseCorrectionInput({ ...base, note: overCap }).ok).toBe(false);
  });
});

describe('kindLabel', () => {
  it('labels both kinds', () => {
    expect(kindLabel('note')).toBe('Note');
    expect(kindLabel('correction')).toBe('Correction');
  });

  it('CORRECTION_KINDS holds exactly the two kinds', () => {
    expect([...CORRECTION_KINDS].sort()).toEqual(['correction', 'note']);
  });
});

describe('correctionsByRun', () => {
  function entry(partial: Partial<CorrectionEntry>): CorrectionEntry {
    return {
      id: 'c1',
      taskRunId: 'run-1',
      kind: 'note',
      note: 'n',
      createdAt: '2026-11-18T00:00:00.000Z',
      ...partial,
    };
  }

  it('returns an empty map for no corrections', () => {
    expect(correctionsByRun([]).size).toBe(0);
  });

  it('groups corrections under their run id', () => {
    const list = [
      entry({ id: 'c1', taskRunId: 'run-1' }),
      entry({ id: 'c2', taskRunId: 'run-2' }),
      entry({ id: 'c3', taskRunId: 'run-1' }),
    ];
    const byRun = correctionsByRun(list);
    expect(byRun.get('run-1')?.map((c) => c.id)).toEqual(['c1', 'c3']);
    expect(byRun.get('run-2')?.map((c) => c.id)).toEqual(['c2']);
    expect(byRun.has('run-3')).toBe(false);
  });

  it('preserves input order within a run', () => {
    const list = [
      entry({ id: 'first', taskRunId: 'run-9' }),
      entry({ id: 'second', taskRunId: 'run-9' }),
    ];
    expect(
      correctionsByRun(list)
        .get('run-9')
        ?.map((c) => c.id),
    ).toEqual(['first', 'second']);
  });
});
