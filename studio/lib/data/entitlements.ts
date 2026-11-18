import { createClient } from '@/lib/data/supabase/server';
import { getMyOrgId } from '@/lib/data/runs';
import type { TierName } from '@/lib/domain/entitlements';

/**
 * Data-Source helpers for entitlement resolution (Phase 1, ADR-0023 / ADR-0003). READ-ONLY.
 * Everything runs under the caller's JWT, so org isolation is enforced by RLS — these never widen
 * access. The Service gate (app/(app)/skills/actions.ts) reads these, then calls the pure
 * resolveEntitlement(); the Domain safety code never imports this file.
 */

export type OrgEntitlement = {
  tier: TierName;
  premiumUntil: Date | null;
};

/**
 * The caller's org tier + when premium ends. Returns `null` on read failure or if the org row is
 * unreadable — the gate then defaults to the free tier (denies premium, still grants baseline
 * safety; ADR-0023 §5). Never throws the run.
 */
export async function getOrgEntitlement(): Promise<OrgEntitlement | null> {
  const orgId = await getMyOrgId();
  if (!orgId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('org')
    .select('tier, premium_until')
    .eq('id', orgId)
    .single();
  if (error || !data) {
    if (error) console.error('getOrgEntitlement failed:', error.message);
    return null;
  }
  const row = data as { tier: TierName; premium_until: string | null };
  return {
    tier: row.tier,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : null,
  };
}

/** UTC start of the calendar month containing `now` (the run-cap window). */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * How many governed runs the caller's org has made this calendar month (the cap meter). Counts
 * task_run rows created at/after the month start; a capped attempt never opens a run, so it is not
 * counted. Returns `null` on failure — the gate treats that as 0 and lets the run proceed (a safe
 * run is never blocked by a transient count error; capacity fails open, safety is unaffected).
 */
export async function countOrgRunsThisMonth(now: Date = new Date()): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('task_run')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart(now).toISOString());
  if (error) {
    console.error('countOrgRunsThisMonth failed:', error.message);
    return null;
  }
  return count ?? 0;
}
