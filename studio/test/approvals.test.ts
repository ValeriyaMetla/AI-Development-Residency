import { describe, it, expect } from 'vitest';
import { parseReviewInput, MAX_REVIEW_NOTE, MAX_EDITED_OUTPUT } from '@/lib/domain/approvals';

/**
 * The approval-gate input validator (ADR-0020). It is the one place untrusted review payloads are
 * checked before any write, so the tests cover the accept path, every reject path, and the note
 * normalization rules.
 */
describe('parseReviewInput', () => {
  it('accepts a valid approve with a note', () => {
    const r = parseReviewInput({ taskRunId: 'run-1', decision: 'approved', note: 'Looks good' });
    expect(r).toEqual({
      ok: true,
      taskRunId: 'run-1',
      decision: 'approved',
      note: 'Looks good',
      editedOutput: null,
    });
  });

  it('accepts a valid reject with no note (note → null)', () => {
    const r = parseReviewInput({ taskRunId: 'run-2', decision: 'rejected' });
    expect(r).toEqual({
      ok: true,
      taskRunId: 'run-2',
      decision: 'rejected',
      note: null,
      editedOutput: null,
    });
  });

  it('trims the run id and the note', () => {
    const r = parseReviewInput({ taskRunId: '  run-3  ', decision: 'approved', note: '  hi  ' });
    expect(r).toEqual({
      ok: true,
      taskRunId: 'run-3',
      decision: 'approved',
      note: 'hi',
      editedOutput: null,
    });
  });

  it('normalizes a blank / whitespace-only note to null', () => {
    const r = parseReviewInput({ taskRunId: 'run-4', decision: 'approved', note: '   ' });
    expect(r).toMatchObject({ ok: true, note: null });
  });

  it('rejects a missing or blank run id', () => {
    expect(parseReviewInput({ decision: 'approved' }).ok).toBe(false);
    expect(parseReviewInput({ taskRunId: '   ', decision: 'approved' }).ok).toBe(false);
  });

  it('rejects any decision that is not exactly approved/rejected', () => {
    for (const decision of ['approve', 'APPROVED', 'maybe', '', 1, null, undefined]) {
      expect(parseReviewInput({ taskRunId: 'run-5', decision }).ok).toBe(false);
    }
  });

  it('rejects a non-string note', () => {
    expect(parseReviewInput({ taskRunId: 'run-6', decision: 'approved', note: 42 }).ok).toBe(false);
  });

  it('rejects a note over the length cap', () => {
    const tooLong = 'x'.repeat(MAX_REVIEW_NOTE + 1);
    const r = parseReviewInput({ taskRunId: 'run-7', decision: 'rejected', note: tooLong });
    expect(r.ok).toBe(false);
  });

  it('accepts a note exactly at the cap', () => {
    const atCap = 'x'.repeat(MAX_REVIEW_NOTE);
    const r = parseReviewInput({ taskRunId: 'run-8', decision: 'approved', note: atCap });
    expect(r.ok).toBe(true);
  });

  it('rejects a non-object payload', () => {
    expect(parseReviewInput(null).ok).toBe(false);
    expect(parseReviewInput('approved').ok).toBe(false);
    expect(parseReviewInput(undefined).ok).toBe(false);
  });

  it('accepts and trims an edited draft', () => {
    const r = parseReviewInput({
      taskRunId: 'run-9',
      decision: 'approved',
      editedOutput: '  Reworded draft.  ',
    });
    expect(r).toMatchObject({ ok: true, editedOutput: 'Reworded draft.' });
  });

  it('treats an absent edit as null', () => {
    const r = parseReviewInput({ taskRunId: 'run-10', decision: 'approved' });
    expect(r).toMatchObject({ ok: true, editedOutput: null });
  });

  it('rejects an empty / whitespace-only edited draft (not "clear the output")', () => {
    expect(parseReviewInput({ taskRunId: 'r', decision: 'approved', editedOutput: '' }).ok).toBe(
      false,
    );
    expect(parseReviewInput({ taskRunId: 'r', decision: 'approved', editedOutput: '   ' }).ok).toBe(
      false,
    );
  });

  it('rejects a non-string edited draft', () => {
    expect(parseReviewInput({ taskRunId: 'r', decision: 'approved', editedOutput: 7 }).ok).toBe(
      false,
    );
  });

  it('rejects an edited draft over the length cap, accepts one at the cap', () => {
    const tooLong = 'x'.repeat(MAX_EDITED_OUTPUT + 1);
    const atCap = 'x'.repeat(MAX_EDITED_OUTPUT);
    expect(
      parseReviewInput({ taskRunId: 'r', decision: 'approved', editedOutput: tooLong }).ok,
    ).toBe(false);
    expect(parseReviewInput({ taskRunId: 'r', decision: 'approved', editedOutput: atCap }).ok).toBe(
      true,
    );
  });
});
