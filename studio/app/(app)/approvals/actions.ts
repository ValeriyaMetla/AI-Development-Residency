'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId, recordApproval } from '@/lib/data/runs';
import { parseReviewInput, type ReviewDecision } from '@/lib/domain/approvals';
import { AI_PROVENANCE } from '@/lib/domain/provenance';

/**
 * Service layer (ADR-0003): the front door for the human-approval gate. Verifies the session and
 * org, validates the untrusted review payload (secure-coding A03/A04) via the Domain parser, then
 * hands off to the Data-Source writer that records the decision. No governance logic lives here —
 * the Leak Test holds (the same guardrail would apply from a script, not just this UI).
 */

export type ReviewResult =
  | { status: 'done'; decision: ReviewDecision }
  | { status: 'blocked'; message: string }
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

  const ok = await recordApproval({
    orgId,
    taskRunId: parsed.taskRunId,
    decidedBy: user.id,
    decision: parsed.decision,
    note: parsed.note,
    editedOutput,
    editedProvenanceLabel: AI_PROVENANCE,
  });
  if (!ok) {
    return { status: 'failed', message: 'Could not record your decision. Please try again.' };
  }

  // The queue is a server component; refresh it so the resolved run drops off the list.
  revalidatePath('/approvals');
  return { status: 'done', decision: parsed.decision };
}
