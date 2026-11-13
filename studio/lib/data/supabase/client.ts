import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (Data-Source layer, ADR-0003).
 *
 * Uses only the public anon/publishable key (safe for the browser, protected by
 * Row-Level Security). For use inside client components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
