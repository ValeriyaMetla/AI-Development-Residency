import { createClient } from '@/lib/data/supabase/server';

/**
 * Standards library access (Data-Source layer, ADR-0003 / ADR-0008).
 *
 * The baseline rules are a global read-only catalog (RLS SELECT-only). These helpers
 * are how the policy seed (Epic 1) and the Governance Co-Pilot (Epic 4) read them.
 * Queryable by category — structured rows, no vector DB (Build-Plan ADR-4).
 */

export type StandardRule = {
  code: string;
  ruleText: string;
  category: string;
  riskTier: string;
  citation: string;
};

type StandardRuleRow = {
  code: string;
  rule_text: string;
  category: string;
  risk_tier: string;
  citation: string;
};

const RULE_COLUMNS = 'code, rule_text, category, risk_tier, citation';

/** Pure snake_case→camelCase mapper, kept separate so it is unit-testable without a DB. */
export function mapStandardRuleRow(row: StandardRuleRow): StandardRule {
  return {
    code: row.code,
    ruleText: row.rule_text,
    category: row.category,
    riskTier: row.risk_tier,
    citation: row.citation,
  };
}

/** Rules in one category, ordered by code. Returns [] on error (ADR-14 graceful degradation). */
export async function getStandardRulesByCategory(category: string): Promise<StandardRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('standard_rule')
    .select(RULE_COLUMNS)
    .eq('category', category)
    .order('code');
  if (error) {
    console.error('getStandardRulesByCategory failed:', error.message);
    return [];
  }
  return ((data as StandardRuleRow[] | null) ?? []).map(mapStandardRuleRow);
}

/** The whole catalog, ordered by code. Returns [] on error. */
export async function getAllStandardRules(): Promise<StandardRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('standard_rule').select(RULE_COLUMNS).order('code');
  if (error) {
    console.error('getAllStandardRules failed:', error.message);
    return [];
  }
  return ((data as StandardRuleRow[] | null) ?? []).map(mapStandardRuleRow);
}
