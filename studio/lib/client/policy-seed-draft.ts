/**
 * Client-only helpers for the policy-seed wizard's saved draft (Presentation concern, ADR-0003).
 *
 * One source of truth for the localStorage key, shared by the wizard (which reads/writes the draft
 * so an accidental refresh doesn't lose the answers) and the sign-out path (which clears it). This
 * is the PenTest F-04 follow-up **F-11 / SR-21**: the wizard's intake answers must not survive a
 * logout on a shared computer.
 *
 * `clearClientDraftsOnSignOut` is best-effort: storage may be unavailable (private mode, disabled,
 * or server-side with no `localStorage` at all), so it never throws — a failure to clear must never
 * block signing out. Uses `globalThis.localStorage` so the same code is safe in the browser and in
 * the Node test environment (where it is simply absent).
 */

/** The single localStorage key the policy-seed wizard stores its in-progress draft under. */
export const POLICY_SEED_DRAFT_KEY = 'policy-seed-draft-v1';

function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* storage unavailable (private mode, disabled) — sign-out must still proceed */
  }
}

/**
 * Clear any client-side drafts at sign-out (F-11 / SR-21). Today that is only the policy-seed
 * wizard draft — the one piece of app data kept in the browser. If a feature stores another draft
 * key in future, clear it here too so logout stays a single, complete sweep.
 */
export function clearClientDraftsOnSignOut(): void {
  removeKey(POLICY_SEED_DRAFT_KEY);
}
