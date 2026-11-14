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
export type PolicyRuleOrigin = 'standard' | 'baseline' | 'custom';

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
  'id, policy_id, rule_text, standard_rule_id, citation, category, risk_tier, origin, is_baseline_safety, needs_review, source_question, created_at';

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

/** A policy's rules, ordered by creation. Returns [] on error (ADR-14). */
export async function getPolicyRules(policyId: string): Promise<PolicyRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy_rule')
    .select(POLICY_RULE_COLUMNS)
    .eq('policy_id', policyId)
    .order('created_at');
  if (error) {
    console.error('getPolicyRules failed:', error.message);
    return [];
  }
  return ((data as PolicyRuleRow[] | null) ?? []).map(mapPolicyRuleRow);
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
 * Make a policy the org's active one. The partial unique index allows only one active
 * policy per org, so the current active policy is archived first, then the target is
 * activated (two sequential updates, ADR-0009). Returns true only if both succeed.
 */
export async function activatePolicy(params: {
  orgId: string;
  policyId: string;
}): Promise<boolean> {
  const supabase = await createClient();
  // 1) Archive any currently-active policy for this org (keeps the one-active invariant).
  const { error: archiveError } = await supabase
    .from('policy')
    .update({ status: 'archived' })
    .eq('org_id', params.orgId)
    .eq('status', 'active');
  if (archiveError) {
    console.error('activatePolicy (archive) failed:', archiveError.message);
    return false;
  }
  // 2) Activate the target policy.
  const { error: activateError } = await supabase
    .from('policy')
    .update({ status: 'active' })
    .eq('id', params.policyId);
  if (activateError) {
    console.error('activatePolicy (activate) failed:', activateError.message);
    return false;
  }
  return true;
}
