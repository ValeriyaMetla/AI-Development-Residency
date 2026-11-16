import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyProfile } from '@/lib/data/profile';
import { signout } from '@/app/auth/actions';
import AppShell from '@/app/components/app-shell';

/**
 * Layout for the authenticated app (Presentation layer, ADR-0003). Every screen in the
 * app/(app) route group inherits the shared shell. The route group does NOT change URLs
 * (/dashboard, /copilot, ... stay the same); it only wraps these pages in the chrome and
 * guards the session once, here, instead of in every page.
 */

const ROLE_LABEL: Record<string, string> = {
  accountable_leader: 'Accountable Leader',
  frontline_doer: 'Frontline Doer',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Defense in depth — the middleware also guards these routes.
  if (!user) {
    redirect('/login');
  }

  const profile = await getMyProfile();
  const roleLabel = profile ? (ROLE_LABEL[profile.role] ?? profile.role) : '';

  return (
    <AppShell
      email={user.email ?? ''}
      roleLabel={roleLabel}
      role={profile?.role ?? null}
      signOutAction={signout}
    >
      {children}
    </AppShell>
  );
}
