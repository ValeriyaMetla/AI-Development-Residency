'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { recordCorrection } from '@/lib/data/corrections';
import { parseCorrectionInput, type CorrectionKind } from '@/lib/domain/corrections';

/**
 * Service layer (ADR-0003): the front door for the entry-correction / note flow. Verifies the
 * session and org, validates the untrusted correction payload (secure-coding A03/A04) via the Domain
 * parser, then hands off to the Data-Source writer. No governance logic lives here — the Leak Test
 * holds. Own-runs-only is guaranteed by RLS (ADR-0021), so a run the caller did not run simply fails
 * the write (fail closed) rather than being screened here.
 */

export type CorrectionResult =
  | { status: 'done'; kind: CorrectionKind }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/** Record a correction/note on one of the caller's own runs. `input` is untrusted. */
export async function submitCorrection(input: unknown): Promise<CorrectionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const parsed = parseCorrectionInput(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  const ok = await recordCorrection({
    orgId,
    taskRunId: parsed.taskRunId,
    createdBy: user.id,
    kind: parsed.kind,
    note: parsed.note,
  });
  if (!ok) {
    return {
      status: 'failed',
      message: 'Could not save your note. You can only annotate your own runs. Please try again.',
    };
  }

  // The "my entries" view is a server component; refresh it so the new note shows.
  revalidatePath('/dashboard/usage/mine');
  return { status: 'done', kind: parsed.kind };
}
