import { createClient } from '@/lib/data/supabase/server';

/**
 * Data Source (ADR-0003): claim one sign-up attempt against the per-IP limit (ADR-0034 · PenTest
 * F-07 · SR-12).
 *
 * ONE call to the protected database step `claim_signup_attempt`, which checks the per-IP hour
 * limit and records the attempt in one transaction. Sign-up is pre-login, so this runs as the
 * `anon` role (the only role the app ever uses, no admin key); the function is callable by `anon`
 * by the narrow exception documented in ADR-0034. The IP is hashed inside the database, never
 * stored raw.
 *
 * Returns the database's answer as-is ('ok' or 'ip_hour'), or `null` on any error. The Domain's
 * signupThrottleDecision() treats `null` — and anything it doesn't recognise — as a refusal (fail
 * closed). Logs only the error message, never the IP.
 */
export async function claimSignupAttempt(ip: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('claim_signup_attempt', { p_ip: ip });
  if (error) {
    console.error('claimSignupAttempt failed:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}
