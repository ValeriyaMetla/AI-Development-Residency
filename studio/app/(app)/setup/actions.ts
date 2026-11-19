'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { markSetupSkippedForSession } from '@/lib/data/setup-skip';

/**
 * "Skip for now" on /setup (Service layer, ADR-0003). Remembers the choice for this browser
 * session so Home does not send the leader straight back to setup, then goes to Home. Setup comes
 * back on the next browser session until it is complete.
 */
export async function skipSetup(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  await markSetupSkippedForSession();
  redirect('/dashboard');
}
