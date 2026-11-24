'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, resetSessionMarkers } from '@/lib/data/supabase/server';
import {
  validateSignupNames,
  signupThrottleDecision,
  signupErrorMessage,
  firstForwardedIp,
} from '@/lib/domain/signup-limits';
import { claimSignupAttempt } from '@/lib/data/signup-limits';

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

  // A new session starts a fresh 24-hour / 1-hour clock (ADR-0033).
  await resetSessionMarkers();
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

  // SR-11: refuse over-length names before anything is created. The database CHECK constraints
  // (ADR-0034) are the backstop; this gives the person a plain message, not a database error.
  const names = validateSignupNames({ orgName, displayName });
  if (!names.ok) {
    redirect('/signup?error=' + encodeURIComponent(names.message));
  }

  // SR-12: the per-IP sign-up limit, before any account is created. Fails closed — a refusal or any
  // error from the gate stops the sign-up (ADR-0034).
  const ip = firstForwardedIp((await headers()).get('x-forwarded-for'));
  const throttle = signupThrottleDecision(await claimSignupAttempt(ip));
  if (!throttle.allowed) {
    redirect('/signup?error=' + encodeURIComponent(throttle.message));
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
    // F-10 / SR-20 + UX: never echo Supabase's raw text (it reveals whether the email already has
    // an account); turn it into plain, non-disclosing words.
    redirect('/signup?error=' + encodeURIComponent(signupErrorMessage(error.message)));
  }

  // When email confirmation is required, there's a user but no session yet.
  if (data.user && !data.session) {
    redirect('/signup?message=check-email');
  }

  await resetSessionMarkers();
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await resetSessionMarkers();
  revalidatePath('/', 'layout');
  redirect('/login');
}
