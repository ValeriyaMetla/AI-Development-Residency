import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and guards routes.
 * (Called from the root middleware.ts.)
 *
 * Standard @supabase/ssr pattern: do NOT run other logic between creating the
 * client and calling getUser(), or sessions can fail to refresh.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth');
  const isProtected = path.startsWith('/dashboard');

  // Redirect, carrying over any refreshed session cookies so the session isn't lost.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // Unauthenticated users can't reach protected routes.
  if (!user && isProtected) {
    return redirectTo('/login');
  }

  // Authenticated users skip the auth pages.
  if (user && isAuthRoute) {
    return redirectTo('/dashboard');
  }

  return supabaseResponse;
}
