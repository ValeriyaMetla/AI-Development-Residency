'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/data/supabase/server';

/**
 * Auth server actions (Service layer, ADR-0003) — the app's "front door" for
 * sign-up / log-in / log-out. All credential handling is delegated to Supabase
 * Auth; we never store or hash passwords ourselves (secure-coding).
 */

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email and password are required.'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const orgName = String(formData.get('org_name') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();

  if (!email || !password || !orgName) {
    redirect(
      '/signup?error=' + encodeURIComponent('Email, password, and organization name are required.'),
    );
  }

  const supabase = await createClient();
  // org_name + display_name ride along as user metadata; the handle_new_user
  // trigger (ADR-0007) reads them to create the org + Accountable-Leader profile.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { org_name: orgName, display_name: displayName } },
  });
  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message));
  }

  // When email confirmation is required, there's a user but no session yet.
  if (data.user && !data.session) {
    redirect('/signup?message=check-email');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
