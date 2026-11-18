'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getOrgEntitlement, countOrgRunsThisMonth } from '@/lib/data/entitlements';
import { getSkillDef } from '@/lib/domain/skills';
import { resolveEntitlement } from '@/lib/domain/entitlements';
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

  // Entitlement gate (ADR-0023): CAPACITY ONLY, resolved server-side, BEFORE the pipeline. A
  // capped-out free org is blocked here — before any output — so it never produces an unsafe run;
  // an allowed run goes through the unchanged pipeline with the full safety net on every plan.
  // Default-deny on tier (unknown entitlement → free); capacity fails open (a count error lets the
  // safe run proceed), because a cap must never be the reason a SAFE run is refused.
  const entitlement = await getOrgEntitlement();
  const runsThisMonth = await countOrgRunsThisMonth();
  const decision = resolveEntitlement({
    tier: entitlement?.tier ?? 'free',
    premiumUntil: entitlement?.premiumUntil ?? null,
    runsThisMonth: runsThisMonth ?? 0,
  });
  if (!decision.canRun) {
    return {
      status: 'blocked',
      message:
        `You've reached this month's free run limit (${decision.cap} runs). ` +
        `Your safety settings stay fully on — upgrade for more runs, or try again next month.`,
    };
  }

  return runGovernedSkill({ skillKey, userInput: trimmed, userId: user.id, orgId, keepCategories });
}
