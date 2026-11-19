'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { parseSuggestionDecisionInput } from '@/lib/domain/rule-suggestions';
import {
  acceptSuggestion,
  dismissSuggestion,
  type AcceptSuggestionResult,
  type DismissSuggestionResult,
} from '@/lib/domain/rule-suggestion-decide';

/**
 * Service layer (ADR-0003): the front door for rule-suggestion decisions (ADR-0025). Each action
 * verifies the session, the org, and the Accountable Leader role — server-side, every time
 * (secure-coding A01; a hidden button is not access control) — validates the untrusted input, then
 * hands off to the Domain. No business logic lives here.
 */

type Gate = { ok: true; userId: string; orgId: string } | { ok: false; message: string };

async function leaderGate(): Promise<Gate> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You must be signed in.' };
  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { ok: false, message: 'Only an Accountable Leader can decide on rule suggestions.' };
  }
  const orgId = await getMyOrgId();
  if (!orgId) return { ok: false, message: 'No organization found for your account.' };
  return { ok: true, userId: user.id, orgId };
}

/** Add a suggested rule (optionally reworded) to the live policy as a new version. */
export async function acceptRuleSuggestion(input: unknown): Promise<AcceptSuggestionResult> {
  const gate = await leaderGate();
  if (!gate.ok) return { status: 'blocked', message: gate.message };

  const parsed = parseSuggestionDecisionInput(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };
  if (parsed.value.ruleText === undefined) {
    return { status: 'blocked', message: 'Invalid rule text.' };
  }

  const result = await acceptSuggestion({
    orgId: gate.orgId,
    userId: gate.userId,
    suggestionKey: parsed.value.suggestionKey,
    ruleText: parsed.value.ruleText,
  });
  if (result.status === 'accepted') revalidatePath('/policy-seed');
  return result;
}

/** Dismiss a suggestion so it is never suggested again. */
export async function dismissRuleSuggestion(input: unknown): Promise<DismissSuggestionResult> {
  const gate = await leaderGate();
  if (!gate.ok) return { status: 'blocked', message: gate.message };

  const parsed = parseSuggestionDecisionInput(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  const result = await dismissSuggestion({
    orgId: gate.orgId,
    userId: gate.userId,
    suggestionKey: parsed.value.suggestionKey,
  });
  if (result.status === 'dismissed') revalidatePath('/policy-seed');
  return result;
}
