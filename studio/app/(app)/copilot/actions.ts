'use server';

import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { runCopilotAssessment, type CopilotAssessmentResult } from '@/lib/domain/copilot-pipeline';
import {
  missingNoneApplyConfirmation,
  type SignalInput,
  type SignalKey,
} from '@/lib/domain/copilot';

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

export type AssessInput = {
  userInput: string;
  signals: Partial<Record<SignalKey, boolean>>;
  /** The Leader ticked "none of these apply" (required when no risk box is ticked). */
  noneApply?: boolean;
};

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

  // Enforced here, not only in the form: a skipped form must never come back as "Go ahead".
  if (missingNoneApplyConfirmation(signals, input?.noneApply)) {
    return {
      status: 'blocked',
      message: 'Please tick any question that applies, or confirm that none of them apply.',
    };
  }

  return runCopilotAssessment({ userInput, signals, userId: user.id, orgId });
}
