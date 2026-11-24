import { createClient } from '@/lib/data/supabase/server';

/**
 * Data Source (ADR-0003): the login lockout gate (ADR-0037 · PenTest F-04 · SR-07).
 *
 * login_guard is checked BEFORE the password; login_record is called AFTER with the outcome. Both
 * run as the anon role (sign-in is pre-login, no admin key) and hash the email + IP inside the
 * database, so the raw values never leave the app process over the wire as stored data.
 *
 * loginGuard returns the answer as-is ('ok' / 'locked') or `null` on any error; the Domain's
 * loginBlocked() FAILS OPEN on `null` (ADR-0037). recordLogin is best-effort — a failure to record
 * must never block a sign-in. Logs only the error message, never the email or IP.
 */
export async function loginGuard(email: string, ip: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('login_guard', { p_email: email, p_ip: ip });
  if (error) {
    console.error('loginGuard failed:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

export async function recordLogin(email: string, ip: string, success: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('login_record', {
    p_email: email,
    p_ip: ip,
    p_success: success,
  });
  if (error) {
    console.error('recordLogin failed:', error.message);
  }
}
