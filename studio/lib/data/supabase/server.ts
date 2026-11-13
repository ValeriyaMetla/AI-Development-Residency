import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

/**
 * Server-side Supabase client (Data-Source layer, ADR-0003).
 *
 * Uses the user's session cookies, so queries run under that user's JWT and
 * Row-Level Security applies (ADR-12). Never uses the service-role key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // Safe to ignore: the middleware refreshes the session cookies.
          }
        },
      },
    },
  );
}

/**
 * The currently authenticated user, validated against Supabase (not just read
 * from the cookie). Returns null when signed out. Lives in the Data-Source layer
 * so presentation (pages) never touches the Supabase client directly (ADR-0003).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
