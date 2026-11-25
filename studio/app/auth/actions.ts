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
import { LOGIN_GENERIC_ERROR, loginBlocked } from '@/lib/domain/login-lockout';
import { loginGuard, recordLogin } from '@/lib/data/login-lockout';
import { validateNewPassword, resetErrorMessage } from '@/lib/domain/password-reset';
import { logSecurityEvent, emailRef } from '@/lib/security/security-log';

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

  // SR-07: throttle repeated failed logins. The guard is checked BEFORE the password and FAILS OPEN
  // (only an explicit 'locked' blocks — a database blip never locks everyone out). The generic
  // message is the same for a lockout and a wrong password, so neither reveals the account (ADR-0037).
  const ip = firstForwardedIp((await headers()).get('x-forwarded-for'));
  if (loginBlocked(await loginGuard(email, ip))) {
    // F-22 / SR-18 (ADR-0040): a security-event trace, with a hashed email ref — never the email.
    logSecurityEvent({
      event: 'login_blocked',
      action: 'signin',
      ref: emailRef(email),
      outcome: 'locked',
    });
    redirect('/login?error=' + encodeURIComponent(LOGIN_GENERIC_ERROR));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Record the outcome (best-effort): a success clears the account's failures; a failure bumps the
  // per-account and per-IP counters toward a lockout.
  await recordLogin(email, ip, !error);

  if (error) {
    // F-22 / SR-18 (ADR-0040): log the failed sign-in with a hashed email ref, never the raw error.
    logSecurityEvent({
      event: 'login_failed',
      action: 'signin',
      ref: emailRef(email),
      outcome: 'wrong_password',
    });
    redirect('/login?error=' + encodeURIComponent(LOGIN_GENERIC_ERROR));
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
    // F-22 / SR-18 (ADR-0040): repeated sign-up abuse is a refused-access signal worth a trace.
    logSecurityEvent({
      event: 'access_refused',
      action: 'signup',
      ref: emailRef(email),
      outcome: 'rate_limited',
    });
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

/**
 * Step 1 of password recovery: email a reset link. Supabase sends a one-time link to the
 * /auth/callback route, which exchanges it for a short-lived recovery session (see callback/route.ts).
 *
 * Security: the response is identical whether or not the email has an account — we ignore the
 * result and always show the same confirmation, so this form can't be used to discover which
 * emails are registered (secure-coding A07, no account enumeration). `redirectTo` is only honoured
 * by Supabase when it matches the project's Redirect URLs allow-list, so the client-supplied
 * `origin` header can't bend the link to another site.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    redirect('/forgot-password?error=' + encodeURIComponent('Enter your email.'));
  }

  const supabase = await createClient();
  const origin = (await headers()).get('origin');
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/callback` : undefined,
  });

  // Always the same message, success or failure (secure-coding A07).
  redirect('/forgot-password?message=sent');
}

/**
 * Step 2 of password recovery: set the new password. Runs under the short-lived recovery session
 * the callback established. Validates the new password in the Domain layer first, refuses when
 * there is no session (someone opened the page without the email link — fail safe, A10), delegates
 * the hash to Supabase (we never store passwords ourselves), then ends the recovery session so the
 * link can't be reused and sends the person to log in with the new password.
 */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');

  const check = validateNewPassword({ password, confirm });
  if (!check.ok) {
    redirect('/reset-password?error=' + encodeURIComponent(check.message));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // F-22 / SR-18 (ADR-0040): setting a password with no valid recovery session is a refused-access
    // signal (fail-safe A10). No account is known here, so there is no ref to attach.
    logSecurityEvent({ event: 'access_refused', action: 'password_update', outcome: 'no_session' });
    redirect(
      '/reset-password?error=' +
        encodeURIComponent('Your reset link is invalid or has expired. Please request a new one.'),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Never echo Supabase's raw text; map it to plain, non-disclosing words (secure-coding A09).
    redirect('/reset-password?error=' + encodeURIComponent(resetErrorMessage(error.message)));
  }

  await supabase.auth.signOut({ scope: 'local' });
  await resetSessionMarkers();
  revalidatePath('/', 'layout');
  redirect('/login?message=password-updated');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await resetSessionMarkers();
  revalidatePath('/', 'layout');
  redirect('/login');
}
