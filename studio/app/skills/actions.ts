'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { runGovernedSkill, type RunResult } from '@/lib/domain/pipeline';

/**
 * Service layer (ADR-0003): the "front door" for running the trivial Skill. Verifies
 * the session, resolves the caller's org, then hands off to the governed-run pipeline.
 */
export async function runThankYou(input: string): Promise<RunResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: 'blocked', message: 'You must be signed in.' };
  }

  const orgId = await getMyOrgId();
  if (!orgId) {
    return { status: 'blocked', message: 'No organization found for your account.' };
  }

  return runGovernedSkill({
    skillKey: 'draft_thank_you',
    userInput: input,
    userId: user.id,
    orgId,
  });
}
