'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { seedPolicyFromAnswers, type SeedPolicyResult } from '@/lib/domain/policy-seed';
import { activatePolicy } from '@/lib/data/policy';
import { validatePolicySeedAnswers } from '@/lib/domain/policy-seed-spec';

/**
 * Service layer (ADR-0003): the front door for the policy-seed intake. Each action verifies
 * the session + org, validates untrusted input (secure-coding A04), then hands off to the
 * Domain orchestration / Data-Source. No business logic lives here.
 *
 * Human-in-the-loop (responsible-AI): `runPolicySeed` creates a DRAFT; `confirmPolicy`
 * activates it only on the leader's explicit confirmation.
 */

export type RunPolicySeedResult = SeedPolicyResult | { status: 'blocked'; message: string };

/** Generate a draft policy from the leader's intake answers. `input` is untrusted. */
export async function runPolicySeed(input: unknown): Promise<RunPolicySeedResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const parsed = validatePolicySeedAnswers(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  return seedPolicyFromAnswers({ orgId, createdBy: user.id, answers: parsed.answers });
}

export type ConfirmPolicyResult =
  | { status: 'activated'; policyId: string }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/** Activate a draft policy as the org's active one (the leader's explicit confirm step). */
export async function confirmPolicy(policyId: string): Promise<ConfirmPolicyResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  if (typeof policyId !== 'string' || !policyId) {
    return { status: 'blocked', message: 'No policy to activate.' };
  }

  const ok = await activatePolicy({ orgId, policyId });
  return ok
    ? { status: 'activated', policyId }
    : { status: 'failed', message: 'Could not activate the policy. Please try again.' };
}
