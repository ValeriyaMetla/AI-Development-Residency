'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getSkillDef } from '@/lib/domain/skills';
import { runGovernedSkill, type RunResult } from '@/lib/domain/pipeline';
import type { PiiCategory } from '@/lib/domain/pii';

/**
 * Service layer (ADR-0003): the "front door" for the Skill runner. Verifies the session, resolves
 * the caller's org and validates the Skill key, then hands off to the one governed-run pipeline.
 * No model calls or business logic here (ADR-0003 Leak Test) — the pipeline owns governance.
 */
export async function runSkill(
  skillKey: string,
  input: string,
  keepCategories: PiiCategory[] = [],
): Promise<RunResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: 'blocked', message: 'You must be signed in.' };
  }

  // Validate the Skill key against the registry before touching the pipeline (don't pass through
  // arbitrary input as a skill key).
  if (!getSkillDef(skillKey)) {
    return { status: 'blocked', message: 'Unknown Skill.' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { status: 'blocked', message: 'Please describe who and what the note is for.' };
  }

  const orgId = await getMyOrgId();
  if (!orgId) {
    return { status: 'blocked', message: 'No organization found for your account.' };
  }

  return runGovernedSkill({ skillKey, userInput: trimmed, userId: user.id, orgId, keepCategories });
}
