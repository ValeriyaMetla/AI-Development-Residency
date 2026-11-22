import { createClient } from '@/lib/data/supabase/server';

/**
 * Policy data-source accessor (Data-Source layer, ADR-0003 / ADR-0009).
 *
 * All Supabase access for an org's generated AI policy lives here. The policy-seed
 * generator (Domain) and the Governance Co-Pilot (Epic 4) call these helpers; neither
 * touches the Supabase client directly. Everything runs under the user's JWT, so the
 * org-scoped RLS from the policy-seed migration applies. Reads degrade to null/[] on
 * error (ADR-14 graceful degradation); writes log and return false/null.
 */

export type PolicyStatus = 'draft' | 'active' | 'archived';
export type PolicyRuleOrigin = 'standard' | 'baseline' | 'custom' | 'suggested';

export type Policy = {
  id: string;
  orgId: string;
  name: string;
  status: PolicyStatus;
  createdAt: string;
};

export type PolicyRule = {
  id: string;
  policyId: string;
  ruleText: string;
  standardRuleId: string | null;
  citation: string | null;
  category: string;
  riskTier: string;
  origin: PolicyRuleOrigin;
  isBaselineSafety: boolean;
  needsReview: boolean;
  sourceQuestion: string | null;
  /** For origin 'suggested': the rule-suggestion key it was accepted from (ADR-0025). */
  suggestionKey: string | null;
  createdAt: string;
};

export type PolicySeedResponse = {
  id: string;
  policyId: string;
  answers: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
};

type PolicyRow = {
  id: string;
  org_id: string;
  name: string;
  status: PolicyStatus;
  created_at: string;
};

type PolicyRuleRow = {
  id: string;
  policy_id: string;
  rule_text: string;
  standard_rule_id: string | null;
  citation: string | null;
  category: string;
  risk_tier: string;
  origin: PolicyRuleOrigin;
  is_baseline_safety: boolean;
  needs_review: boolean;
  source_question: string | null;
  suggestion_key: string | null;
  created_at: string;
};

type PolicySeedResponseRow = {
  id: string;
  policy_id: string;
  answers: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

const POLICY_COLUMNS = 'id, org_id, name, status, created_at';
const POLICY_RULE_COLUMNS =
  'id, policy_id, rule_text, standard_rule_id, citation, category, risk_tier, origin, is_baseline_safety, needs_review, source_question, suggestion_key, created_at';

// --- Pure mappers (snake_case -> camelCase), kept separate so they are unit-testable ---

export function mapPolicyRow(row: PolicyRow): Policy {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapPolicyRuleRow(row: PolicyRuleRow): PolicyRule {
  return {
    id: row.id,
    policyId: row.policy_id,
    ruleText: row.rule_text,
    standardRuleId: row.standard_rule_id,
    citation: row.citation,
    category: row.category,
    riskTier: row.risk_tier,
    origin: row.origin,
    isBaselineSafety: row.is_baseline_safety,
    needsReview: row.needs_review,
    sourceQuestion: row.source_question,
    suggestionKey: row.suggestion_key ?? null,
    createdAt: row.created_at,
  };
}

export function mapPolicySeedResponseRow(row: PolicySeedResponseRow): PolicySeedResponse {
  return {
    id: row.id,
    policyId: row.policy_id,
    answers: row.answers,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// --- Reads -----------------------------------------------------------------

/** The org's active policy, or null (none active, signed out, or error). */
export async function getActivePolicy(orgId: string): Promise<Policy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy')
    .select(POLICY_COLUMNS)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    console.error('getActivePolicy failed:', error.message);
    return null;
  }
  return data ? mapPolicyRow(data as PolicyRow) : null;
}

/**
 * The org's most recent draft policy, or null (none, signed out, or error). Lets a leader who
 * generated a starter policy but never activated it resume at the review screen on any device,
 * instead of an empty wizard (Epic 8 resume-after-interruption). Older drafts are ignored here.
 */
export async function getLatestDraftPolicy(orgId: string): Promise<Policy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy')
    .select(POLICY_COLUMNS)
    .eq('org_id', orgId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('getLatestDraftPolicy failed:', error.message);
    return null;
  }
  return data ? mapPolicyRow(data as PolicyRow) : null;
}

/**
 * A policy's rules, ordered by creation — or `null` if they could not be read. Use this where
 * "couldn't load" must not be mistaken for "no rules" (showing the rule editor, publishing a version).
 */
export async function getPolicyRulesOrNull(policyId: string): Promise<PolicyRule[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy_rule')
    .select(POLICY_RULE_COLUMNS)
    .eq('policy_id', policyId)
    .order('created_at');
  if (error) {
    console.error('getPolicyRules failed:', error.message);
    return null;
  }
  return ((data as PolicyRuleRow[] | null) ?? []).map(mapPolicyRuleRow);
}

/** A policy's rules, ordered by creation. Returns [] on error (ADR-14 graceful degradation). */
export async function getPolicyRules(policyId: string): Promise<PolicyRule[]> {
  return (await getPolicyRulesOrNull(policyId)) ?? [];
}

// --- Writes ----------------------------------------------------------------

/** Insert a policy (defaults to draft). Returns the new id, or null on error. */
export async function createPolicy(params: {
  orgId: string;
  name: string;
  status?: PolicyStatus;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy')
    .insert({
      org_id: params.orgId,
      name: params.name,
      status: params.status ?? 'draft',
    })
    .select('id')
    .single();
  if (error) {
    console.error('createPolicy failed:', error.message);
    return null;
  }
  return data.id as string;
}

export type NewPolicyRule = {
  ruleText: string;
  standardRuleId?: string | null;
  citation?: string | null;
  category: string;
  riskTier: string;
  origin: PolicyRuleOrigin;
  isBaselineSafety?: boolean;
  needsReview?: boolean;
  sourceQuestion?: string | null;
  /** Set only for an accepted rule suggestion (origin 'suggested', ADR-0025). */
  suggestionKey?: string | null;
};

/** Bulk-insert a policy's rules. Returns true on success, false on error. */
export async function insertPolicyRules(
  policyId: string,
  rules: NewPolicyRule[],
): Promise<boolean> {
  if (rules.length === 0) return true;
  const supabase = await createClient();
  const { error } = await supabase.from('policy_rule').insert(
    rules.map((r) => ({
      policy_id: policyId,
      rule_text: r.ruleText,
      standard_rule_id: r.standardRuleId ?? null,
      citation: r.citation ?? null,
      category: r.category,
      risk_tier: r.riskTier,
      origin: r.origin,
      is_baseline_safety: r.isBaselineSafety ?? false,
      needs_review: r.needsReview ?? false,
      source_question: r.sourceQuestion ?? null,
      suggestion_key: r.suggestionKey ?? null,
    })),
  );
  if (error) {
    console.error('insertPolicyRules failed:', error.message);
    return false;
  }
  return true;
}

/** Store the raw intake answers behind a policy. Returns true on success, false on error. */
export async function savePolicySeedResponse(params: {
  policyId: string;
  answers: Record<string, unknown>;
  createdBy: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from('policy_seed_response').insert({
    policy_id: params.policyId,
    answers: params.answers,
    created_by: params.createdBy,
  });
  if (error) {
    console.error('savePolicySeedResponse failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Make a draft policy the org's active one (ADR-0031). ONE call to the protected database step
 * `activate_policy`, which checks the caller is a leader and the policy is a draft with rules in
 * their own org, then archives the old active policy and activates this one in a single transaction —
 * so a half-done switch can't happen (F-18). Members have no direct UPDATE on `policy` (F-03).
 *
 * Returns the database's answer as-is ('ok', or why not), or `null` on any error. The Domain's
 * policyActivationResult() decides what it means and fails closed on anything but 'ok'.
 */
export async function activatePolicy(policyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('activate_policy', { p_policy_id: policyId });
  if (error) {
    console.error('activatePolicy failed:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

/**
 * Discard ("start over") every draft policy in the caller's org by archiving it (ADR-0031). ONE call
 * to the protected step `discard_draft_policies`: leader only, the org taken from the database.
 * Policies are never deleted (append-only record), so a discarded draft is kept as `archived`, and all
 * drafts are archived so an older one doesn't resurface.
 *
 * Returns the database's answer as-is, or `null` on any error (the Domain's discardDraftsResult()
 * treats anything but 'ok' as a failure).
 */
export async function archiveDraftPolicies(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('discard_draft_policies');
  if (error) {
    console.error('archiveDraftPolicies failed:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}
