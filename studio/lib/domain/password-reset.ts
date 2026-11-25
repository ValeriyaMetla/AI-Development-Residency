/**
 * Password-reset domain logic (pure, framework-free — ADR-0003 Domain layer).
 *
 * The Service-layer actions (app/auth/actions.ts) own the Supabase calls; this module owns the
 * rules that must be unit-testable:
 *  - the new-password policy (length + confirmation match);
 *  - the single neutral "we sent a link" message that never reveals whether an account exists
 *    (secure-coding A07 — no account enumeration from the reset form);
 *  - the plain-language mapping of recovery errors, so Supabase's raw text is never shown to the
 *    person (secure-coding A09) and nothing in it discloses account state.
 */

/** Minimum new-password length. Stricter than Supabase's 6-char default; the server is the gate. */
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt only hashes the first 72 bytes, so refuse longer — what's typed is then what's checked. */
export const MAX_PASSWORD_LENGTH = 72;

export type PasswordCheck = { ok: true } | { ok: false; message: string };

/**
 * Validate a chosen new password and its confirmation. Pure: the same input always gives the same
 * result, so it is cheap to unit-test and runs the same whether called from a form or a script
 * (Leak Test). The Service action calls this before touching Supabase.
 */
export function validateNewPassword({
  password,
  confirm,
}: {
  password: string;
  confirm: string;
}): PasswordCheck {
  if (!password) return { ok: false, message: 'Enter a new password.' };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: `Use ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }
  if (password !== confirm) return { ok: false, message: 'The two passwords do not match.' };
  return { ok: true };
}

/**
 * The one message the reset-request page always shows, whether or not the email has an account.
 * The identical output is the point: it stops someone using this form to learn which emails have
 * accounts (secure-coding A07). The Service action shows this on success AND on error.
 */
export const RESET_REQUEST_CONFIRMATION =
  "If an account exists for that email, we've sent a link to reset your password. Check your inbox.";

/**
 * Turn a Supabase recovery error into plain, non-disclosing words for the set-new-password step.
 * Unknown errors fall back to a generic message — raw provider text is never returned
 * (secure-coding A09), and nothing here reveals whether an account exists.
 */
export function resetErrorMessage(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes('expired') || text.includes('invalid') || text.includes('token')) {
    return 'This reset link has expired or already been used. Please request a new one.';
  }
  if (text.includes('different from the old') || text.includes('should be different')) {
    return 'Your new password must be different from your current one.';
  }
  if (text.includes('weak') || text.includes('at least') || text.includes('password')) {
    return `Choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return 'We could not update your password. Please request a new reset link and try again.';
}
