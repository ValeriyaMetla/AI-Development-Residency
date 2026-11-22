import { createClient } from '@/lib/data/supabase/server';
import type { AiRequestKind } from '@/lib/domain/rate-limit';

/**
 * Data Source (ADR-0003): claim one AI request against the limits (ADR-0030 · PenTest F-02).
 *
 * ONE call to the protected database step `claim_ai_request`, which checks every limit and records
 * the request in one transaction, as the signed-in user (no admin key). The org and the limits are
 * decided inside the database, never sent from here.
 *
 * Returns the database's answer as-is ('ok', or which limit was reached), or `null` on any error.
 * The Domain's rateLimitDecision() treats `null` — and anything it doesn't recognise — as a refusal
 * (fail closed, SR-03). Logs only the error message, never the person's text.
 */
export async function claimAiRequest(kind: AiRequestKind): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('claim_ai_request', { p_kind: kind });
  if (error) {
    console.error('claimAiRequest failed:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}
