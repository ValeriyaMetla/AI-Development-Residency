'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId, recordApproval } from '@/lib/data/runs';
import {
  parseReviewInput,
  reviewOutcomeMessage,
  type ReviewDecision,
} from '@/lib/domain/approvals';

/**
 * Service layer (ADR-0003): the front door for the human-approval gate. Verifies the session and
 * org, validates the untrusted review payload (secure-coding A03/A04) via the Domain parser, then
 * hands off to the Data-Source writer, which calls the protected database step review_task_run
 * (ADR-0028). The database decides whether the run can be reviewed; this action only turns its
 * answer into a plain message. No governance logic lives here — the Leak Test holds.
 */

export type ReviewResult =
  | { status: 'done'; decision: ReviewDecision }
  /** `closed`: the run can no longer be reviewed here (already decided, or not found) — hide the controls. */
  | { status: 'blocked'; message: string; closed?: boolean }
  | { status: 'failed'; message: string };

/** Record a reviewer's approve/reject decision on a flagged run. `input` is untrusted. */
export async function submitReview(input: unknown): Promise<ReviewResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const parsed = parseReviewInput(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  // An edit only applies when approving; a rejected draft is discarded, not versioned.
  const editedOutput = parsed.decision === 'approved' ? parsed.editedOutput : null;

  const outcome = await recordApproval({
    taskRunId: parsed.taskRunId,
    decision: parsed.decision,
    note: parsed.note,
    editedOutput,
  });
  if (outcome === null) {
    return { status: 'failed', message: 'Could not record your decision. Please try again.' };
  }
  if (outcome !== 'ok') {
    // Refused by the database (e.g. already reviewed in another tab). Refresh the queue so the
    // stale run drops off, and say plainly what happened.
    revalidatePath('/approvals');
    return {
      status: 'blocked',
      message: reviewOutcomeMessage(outcome),
      closed: outcome === 'not_pending' || outcome === 'not_found',
    };
  }

  // The queue is a server component; refresh it so the resolved run drops off the list.
  revalidatePath('/approvals');
  return { status: 'done', decision: parsed.decision };
}
