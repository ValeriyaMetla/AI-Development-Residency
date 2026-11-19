/**
 * Audit event vocabulary (Domain layer, ADR-0003 / ADR-0026). ONE source of truth for which kinds
 * of event the governed record may hold, and for how the product describes the record's protection.
 *
 * - The database enforces the same list (check constraint `audit_event_known_type` in
 *   `supabase/migrations/20261118100000_audit_insert_integrity.sql`). A static test fails if the
 *   two drift, or if any `writeAuditEvent` call in `lib/` uses a kind missing from this list.
 *   Adding a kind = edit this list AND add a migration that replaces the constraint.
 * - The audit trail and the responsible-AI summary both read this list and this statement, so the
 *   screen and the export can never describe the record differently.
 *
 * Pure: no I/O, no Supabase. Payloads never carry sensitive content (Build Plan ADR-6).
 */

/** Every kind of event the product writes to `audit_event`, in pipeline order. */
export const AUDIT_EVENT_TYPES = [
  'pii_stripped',
  'pii_kept',
  'risky_use_flagged',
  'task_blocked',
  'task_completed',
  'task_approved',
  'task_rejected',
  'task_run_corrected',
  'copilot_assessed',
  'policy_seeded',
  'policy_edited',
  'rule_suggestion_accepted',
  'rule_suggestion_dismissed',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/** True when `value` is a known kind. Readers use it to show unknown kinds as "Other recorded event". */
export function isAuditEventType(value: string): value is AuditEventType {
  return (AUDIT_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * The plain-language protection statement shown on the audit trail and in the summary export
 * (card "Ensure audit entries can't be silently altered", US7). It claims ONLY what ADR-0026 points
 * 1–5 enforce, and names the gap it does not close (database-administrator edits). Change it only
 * when the enforcement changes — never to sound stronger.
 */
export const AUDIT_PROTECTION_STATEMENT =
  'How this record is protected: No one using Studio can change or remove an entry. ' +
  'Each entry’s time is set by the system, and each is recorded under the account that took ' +
  'the action. Someone with direct administrator access to the database could still alter ' +
  'records; Studio doesn’t yet detect that.';
