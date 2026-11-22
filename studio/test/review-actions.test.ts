import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Human-review Service action (ADR-0020 / ADR-0028). The database's review_task_run decides whether
 * a run can be reviewed; submitReview checks the session and org, validates the untrusted payload,
 * makes ONE call, and turns the database's answer into a plain message.
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/data/supabase/server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({ getMyOrgId: vi.fn(), recordApproval: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId, recordApproval } from '@/lib/data/runs';
import { submitReview } from '@/app/(app)/approvals/actions';

const APPROVE = { taskRunId: 'run-1', decision: 'approved', note: 'Looks right' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user1' } as never);
  vi.mocked(getMyOrgId).mockResolvedValue('org1');
  vi.mocked(recordApproval).mockResolvedValue('ok');
});

describe('submitReview', () => {
  it('records an approval with one call and refreshes the queue', async () => {
    await expect(submitReview(APPROVE)).resolves.toEqual({ status: 'done', decision: 'approved' });
    expect(recordApproval).toHaveBeenCalledTimes(1);
    expect(recordApproval).toHaveBeenCalledWith({
      taskRunId: 'run-1',
      decision: 'approved',
      note: 'Looks right',
      editedOutput: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/approvals');
  });

  it('never sends who decided — the database uses the signed-in user', async () => {
    await submitReview(APPROVE);
    const sent = vi.mocked(recordApproval).mock.calls[0][0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('decidedBy');
    expect(sent).not.toHaveProperty('orgId');
  });

  it('drops an edit sent with a rejection', async () => {
    await submitReview({ taskRunId: 'run-1', decision: 'rejected', editedOutput: 'New text' });
    expect(vi.mocked(recordApproval).mock.calls[0][0]).toMatchObject({
      decision: 'rejected',
      editedOutput: null,
    });
  });

  it('says plainly when the run was already reviewed (F-21), and refreshes the stale queue', async () => {
    vi.mocked(recordApproval).mockResolvedValue('not_pending');
    await expect(submitReview(APPROVE)).resolves.toEqual({
      status: 'blocked',
      message: 'This run has already been reviewed, or wasn’t flagged for review.',
      closed: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/approvals');
  });

  it('gives the same answer for a missing run and another org’s run', async () => {
    vi.mocked(recordApproval).mockResolvedValue('not_found');
    await expect(submitReview(APPROVE)).resolves.toEqual({
      status: 'blocked',
      message: 'We couldn’t find that run.',
      closed: true,
    });
  });

  it('keeps the controls open for a fixable refusal (invalid input)', async () => {
    vi.mocked(recordApproval).mockResolvedValue('invalid');
    await expect(submitReview(APPROVE)).resolves.toEqual({
      status: 'blocked',
      message: 'Check your note and any edits, then try again.',
      closed: false,
    });
  });

  it('asks to try again when the call itself fails', async () => {
    vi.mocked(recordApproval).mockResolvedValue(null);
    await expect(submitReview(APPROVE)).resolves.toEqual({
      status: 'failed',
      message: 'Could not record your decision. Please try again.',
    });
  });

  it('refuses before any database call when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    await expect(submitReview(APPROVE)).resolves.toMatchObject({ status: 'blocked' });
    expect(recordApproval).not.toHaveBeenCalled();
  });

  it('refuses an invalid payload before any database call', async () => {
    await expect(submitReview({ taskRunId: 'run-1', decision: 'maybe' })).resolves.toEqual({
      status: 'blocked',
      message: 'Choose approve or reject.',
    });
    expect(recordApproval).not.toHaveBeenCalled();
  });
});
