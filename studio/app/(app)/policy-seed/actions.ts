'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { seedPolicyFromAnswers, type SeedPolicyResult } from '@/lib/domain/policy-seed';
import {
  activatePolicy,
  archiveDraftPolicies,
  getActivePolicy,
  getPolicyRulesOrNull,
} from '@/lib/data/policy';
import { validatePolicySeedAnswers } from '@/lib/domain/policy-seed-spec';
import { discardDraftsResult, policyActivationResult } from '@/lib/domain/policy-activation';
import { parsePolicyEditInput } from '@/lib/domain/policy-edit';
import { publishEditedPolicy, publishImportedPolicy } from '@/lib/domain/policy-publish';
import { serializePolicy, parsePolicyImport } from '@/lib/domain/policy-export';

/**
 * Service layer (ADR-0003): the front door for the policy-seed intake. Each action verifies
 * the session + org, validates untrusted input (secure-coding A04), then hands off to the
 * Domain orchestration / Data-Source. No business logic lives here.
 *
 * Human-in-the-loop (responsible-AI): `runPolicySeed` creates a DRAFT; `confirmPolicy`
 * activates it only on the leader's explicit confirmation. All three seed actions are Leader-only.
 */

/**
 * Setting up the policy (generate, activate, start over) is a Leader action — access control,
 * secure-coding A01 — enforced server-side here, not just hidden in the UI. Signup makes the
 * org's first user an Accountable Leader, so self-serve setup is unaffected.
 */
const SETUP_LEADER_ONLY = 'Only an Accountable Leader can set up the AI policy.';

export type RunPolicySeedResult = SeedPolicyResult | { status: 'blocked'; message: string };

/** Generate a draft policy from the leader's intake answers. `input` is untrusted. */
export async function runPolicySeed(input: unknown): Promise<RunPolicySeedResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: SETUP_LEADER_ONLY };
  }

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

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: SETUP_LEADER_ONLY };
  }

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  if (typeof policyId !== 'string' || !policyId) {
    return { status: 'blocked', message: 'No policy to activate.' };
  }

  // The database checks leader, org, draft and rules, and switches all-or-nothing (ADR-0031). Only an
  // explicit 'ok' is reported as activated; anything else says nothing changed (F-18).
  const result = policyActivationResult(await activatePolicy(policyId));
  return result.ok
    ? { status: 'activated', policyId }
    : { status: 'failed', message: result.message };
}

export type DiscardDraftResult =
  | { status: 'discarded' }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/**
 * "Start over": discard the org's unactivated draft policy so the leader can re-run the seed
 * wizard. Drafts are archived, never deleted (append-only record). A discarded draft never took
 * effect, so — like generating one — it writes no audit event.
 */
export async function discardDraftPolicy(): Promise<DiscardDraftResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: SETUP_LEADER_ONLY };
  }

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const result = discardDraftsResult(await archiveDraftPolicies());
  if (!result.ok) return { status: 'failed', message: result.message };

  revalidatePath('/policy-seed');
  return { status: 'discarded' };
}

export type PublishEditsResult =
  | { status: 'published'; ruleCount: number }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/**
 * Publish edits to the org's active policy as a new version (ADR-0024). Editing the policy is a
 * Leader action (access control, secure-coding A01), so the role is enforced here — not just hidden
 * in the nav. The current rules are read server-side (authoritative); the client's `input` is a
 * trusted-nowhere diff validated by the Domain parser before any write.
 */
export async function publishRuleEdits(input: unknown): Promise<PublishEditsResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: 'Only an Accountable Leader can edit the policy.' };
  }

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const active = await getActivePolicy(orgId);
  if (!active) return { status: 'blocked', message: 'There is no active policy to edit yet.' };

  const parsed = parsePolicyEditInput(input);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  // Authoritative current rules — never trust a client-sent ruleset; apply the diff to these.
  const current = await getPolicyRulesOrNull(active.id);
  if (current === null) {
    return { status: 'failed', message: 'Could not load your current rules. Nothing was changed.' };
  }

  const result = await publishEditedPolicy({
    orgId,
    createdBy: user.id,
    policyName: active.name,
    current,
    input: parsed.value,
  });

  if (result.status === 'published') {
    revalidatePath('/policy-seed');
    return { status: 'published', ruleCount: result.ruleCount };
  }
  return result;
}

export type ExportPolicyResult =
  { status: 'ok'; filename: string; json: string } | { status: 'blocked'; message: string };

/**
 * Export the org's active policy as a portable JSON string for the client to download (Epic 1
 * portability). Leader-only (access control); reads the active policy + its rules and serializes
 * them via the pure Domain serializer — no org/row ids, so the file re-imports into any org.
 */
export async function exportPolicy(): Promise<ExportPolicyResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: 'Only an Accountable Leader can export the policy.' };
  }

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const active = await getActivePolicy(orgId);
  if (!active) return { status: 'blocked', message: 'There is no active policy to export yet.' };

  const rules = await getPolicyRulesOrNull(active.id);
  if (rules === null) {
    return { status: 'blocked', message: 'Could not load your rules. Nothing was exported.' };
  }

  const json = JSON.stringify(serializePolicy(active, rules), null, 2);
  const slug = active.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return { status: 'ok', filename: `policy-${slug || 'export'}.json`, json };
}

export type ImportPolicyResult =
  | { status: 'published'; ruleCount: number }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/**
 * Import a policy from an uploaded file's text and publish it as a new active version (Epic 1
 * portability). Leader-only. `raw` is untrusted — the pure Domain parser validates it (secure-coding)
 * and rejects a malformed file with a clear message before anything is written; a valid file publishes
 * via the same versioned path as an edit (ADR-0024).
 */
export async function importPolicy(raw: unknown): Promise<ImportPolicyResult> {
  const user = await getCurrentUser();
  if (!user) return { status: 'blocked', message: 'You must be signed in.' };

  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return { status: 'blocked', message: 'Only an Accountable Leader can import a policy.' };
  }

  const orgId = await getMyOrgId();
  if (!orgId) return { status: 'blocked', message: 'No organization found for your account.' };

  const parsed = parsePolicyImport(raw);
  if (!parsed.ok) return { status: 'blocked', message: parsed.error };

  const result = await publishImportedPolicy({
    orgId,
    createdBy: user.id,
    policyName: parsed.name,
    rules: parsed.rules,
  });

  if (result.status === 'published') {
    revalidatePath('/policy-seed');
    return { status: 'published', ruleCount: result.ruleCount };
  }
  return result;
}
