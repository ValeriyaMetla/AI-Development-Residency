import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  parseReviewInput,
  MAX_REVIEW_NOTE,
  MAX_EDITED_OUTPUT,
  REVIEW_OUTCOMES,
  canBeReviewed,
  parseReviewOutcome,
  reviewOutcomeMessage,
} from '@/lib/domain/approvals';

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

/**
 * ADR-0028: the database decides; these helpers only mirror it for display and wording. The caps
 * test keeps the app's limits and the ones repeated inside review_task_run from drifting apart.
 */
describe('review outcomes (ADR-0028)', () => {
  it('only a needs_review run can be reviewed — the first decision is final', () => {
    expect(canBeReviewed('needs_review')).toBe(true);
    for (const s of ['running', 'blocked', 'completed', 'approved', 'rejected', ''])
      expect(canBeReviewed(s)).toBe(false);
  });

  it('accepts every outcome the database can return', () => {
    for (const o of REVIEW_OUTCOMES) expect(parseReviewOutcome(o)).toBe(o);
  });

  it('treats anything else from the database as a failure (null)', () => {
    for (const v of [null, undefined, '', 'OK', 'approved', 42, { outcome: 'ok' }])
      expect(parseReviewOutcome(v)).toBeNull();
  });

  it('gives every refusal a plain, non-empty message', () => {
    for (const o of REVIEW_OUTCOMES.filter((x) => x !== 'ok')) {
      const msg = reviewOutcomeMessage(o);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).not.toMatch(/sql|postgres|policy|rls|42501/i);
    }
  });

  it('says plainly when a run was already reviewed', () => {
    expect(reviewOutcomeMessage('not_pending')).toBe(
      'This run has already been reviewed, or wasn’t flagged for review.',
    );
  });

  it('keeps the app caps equal to the ones enforced inside review_task_run', () => {
    const sql = readFileSync('supabase/migrations/20261121120000_review_task_run.sql', 'utf8');
    expect(sql).toContain(`char_length(v_note) > ${MAX_REVIEW_NOTE}`);
    expect(sql).toContain(`char_length(p_edited_output) > ${MAX_EDITED_OUTPUT}`);
  });
});
