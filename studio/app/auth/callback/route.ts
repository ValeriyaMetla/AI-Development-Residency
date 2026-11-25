import { NextResponse } from 'next/server';
import { createClient } from '@/lib/data/supabase/server';

/**
 * Password-recovery callback (Service layer, ADR-0003).
 *
 * Supabase emails a link here with a one-time `code`. We exchange it for a short-lived recovery
 * session (the cookies are set by the Data-Source client) and send the person to /reset-password
 * to choose a new password.
 *
 * Security:
 *  - the redirect target is a fixed internal path built from the request's own origin, so the link
 *    can't be bent into an open redirect (secure-coding A10);
 *  - on any failure we send them to login with a plain message and never show the raw error (A09);
 *  - no `code`, or a code that won't exchange, is treated as an expired/used link — fail safe.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL('/reset-password', request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      '/login?error=' +
        encodeURIComponent(
          'That reset link has expired or already been used. Please request a new one.',
        ),
      request.url,
    ),
  );
}
