import { createClient } from '@/lib/data/supabase/server';

/**
 * Profile + org for the current user (Data-Source layer, ADR-0003).
 *
 * Runs under the user's JWT, so RLS (Step 5) returns only their own profile and
 * org. Returns null when signed out or when no profile row exists yet.
 */
export type MyProfile = {
  display_name: string | null;
  role: 'accountable_leader' | 'frontline_doer';
  org: { name: string } | null;
};

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile')
    .select('display_name, role, org(name)')
    .maybeSingle();
  if (error) {
    console.error('getMyProfile failed:', error.message);
    return null;
  }
  return (data as MyProfile | null) ?? null;
}
