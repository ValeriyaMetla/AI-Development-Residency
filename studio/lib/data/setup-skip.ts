import { cookies } from 'next/headers';

/**
 * "Skip setup for now" marker (Data-Source layer, ADR-0003) — Epic 8 self-serve setup.
 *
 * A browser-session cookie (no expiry, so it is cleared when the browser closes) that tells Home
 * not to send a leader back to /setup after they chose "Skip for now". It holds no personal or org
 * data — only "1". It is a convenience, not a permission: setup itself is worked out from the
 * database, and nothing about access or safety depends on this cookie.
 */

const SETUP_SKIP_COOKIE = 'setup_skipped';

export async function hasSkippedSetupThisSession(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(SETUP_SKIP_COOKIE)?.value === '1';
  } catch {
    // Unreadable cookies → treat as not skipped; the worst case is one extra visit to /setup.
    return false;
  }
}

/** Only callable from a Server Action or Route Handler (where cookies can be set). */
export async function markSetupSkippedForSession(): Promise<void> {
  const store = await cookies();
  store.set(SETUP_SKIP_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
