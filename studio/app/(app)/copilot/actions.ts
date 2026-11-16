'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { runCopilotAssessment, type CopilotAssessmentResult } from '@/lib/domain/copilot-pipeline';
import type { SignalInput, SignalKey } from '@/lib/domain/copilot';

/**
 * Service layer (ADR-0003): the front door for the Governance Co-Pilot. Verifies the session + org
 * and validates the untrusted input (secure-coding A04), then hands off to the Domain pipeline.
 * No business logic here — the tiering lives in lib/domain/copilot.ts.
 */

const SIGNAL_KEYS: SignalKey[] = [
  'bannedPurpose',
  'judgesPerson',
  'highStakesDomain',
  'sensitiveData',
  'outputLeavesOrg',
];

export type AssessInput = { userInput: string; signals: Partial<Record<SignalKey, boolean>> };

/** Assess a described AI use. `input` is untrusted and fully validated here. */
export async function assessUse(input: AssessInput): Promise<CopilotAssessmentResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const userInput = typeof input?.userInput === 'string' ? input.userInput.trim() : '';
  if (!userInput) {
    return { status: 'blocked', message: 'Please describe the use you want advice on.' };
  }
  if (userInput.length > 2000) {
    return { status: 'blocked', message: 'Please keep the description under 2000 characters.' };
  }

  const raw = input?.signals ?? {};
  const signals = {} as SignalInput;
  for (const key of SIGNAL_KEYS) signals[key] = raw[key] === true;

  return runCopilotAssessment({ userInput, signals, userId: user.id, orgId });
}
