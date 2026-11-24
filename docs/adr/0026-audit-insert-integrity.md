# ADR-0026: The database stamps each audit entry's time and identity; app users may add only known kinds of event, as themselves, about their own organization

- **Status:** Accepted — partly superseded by [ADR-0039](0039-audit-write-via-protected-function.md) (points 1–2: app users lose direct insert; audit writes go through one protected function)
- **Date:** 2026-11-18

## Context

The audit trail (Epic 7) is the product's proof to funders and boards. Editing and deleting entries
is already blocked for app users at the database level (`20261112020000_audit_append_only`,
ADR-0013), and clearing them is blocked too (`20261118040000_revoke_truncate`). Val's read-only live
check on 2026-11-18 confirmed both. The same check found that **adding** entries is barely
restricted. The insert rule checks only that an entry belongs to the writer's organization. Every
column can be filled in by the writer, including the identifier, the time, the person credited and
the event kind. Any signed-in member could backdate an entry, credit it to a colleague, attach it to
any run, or invent an event kind. The sibling record tables already block crediting someone else
(`approval`, ADR-0020; `run_correction`, ADR-0021). The event log is the outlier.

Forces in tension:

- **Trust in the record vs. the lane rule.** The strongest fix is to route every write through one
  protected database function. But that means changing `writeAuditEvent` in `lib/data/runs.ts`,
  which is Lane A's file and is called from 7 places.
- **Refuse vs. silently correct.** The database could quietly overwrite a supplied time or person.
  Refusing instead makes a bad write visible, but every refused write is dropped silently, because
  `writeAuditEvent` only logs failures to the console.
- **Proof vs. credential-free CI.** Required checks run without database access (ADR-0016). CI can
  check what the migrations say, but not how the live database behaves.
- **YAGNI vs. tamper-detection.** A hash chain would detect edits by a database administrator. Today
  the only such people are Val and the hosting provider.

## Decision

**Add rules at the database level, in one migration
(`20261118100000_audit_insert_integrity.sql`). The pipeline and Lane A's files don't change.**

1. **The database sets the time and identifier.** App users lose the right to insert the event log's
   `id` and `created_at` columns. They keep it for `org_id`, `task_run_id`, `actor`, `event_type` and
   `payload`. A write that tries to supply a time or identifier is refused, and both are filled by
   the existing column defaults. Every current writer already leaves both columns out (read in
   code), so no writer changes.
2. **An entry is credited to the person writing it, about their own organization's runs.** The
   insert rule is replaced so that a new entry must belong to the writer's organization, **and** its
   `actor` must be the signed-in user (an empty actor fails), **and** its `task_run_id` must be blank
   or a run in the writer's organization. This mirrors the approval and correction rules.
3. **Only known kinds of event.** A database check on `event_type` allows exactly the 11 kinds
   written today. It's added in a mode that enforces new entries only, because history isn't
   rewritten. Whether existing rows also comply is confirmed live afterwards. The same 11 kinds live
   in **one** code list, a new `lib/domain/audit-events.ts`, which the audit trail's wording also
   uses. A static test fails if the migration list and the code list differ, or if any event name
   passed to `writeAuditEvent` anywhere in `lib/` is missing from the list. Adding a kind of event
   means a migration plus a code-list edit, and the test enforces both.
4. **A check keeps the old protection from being undone.** A static test reads every migration and
   fails if any one gives app users (`authenticated`, `anon`) permission to update, delete or clear
   the event log, the approval table or the correction table.
5. **Approval and correction times get the same fix.** App users lose the right to insert `id` and
   `created_at` on `approval` and `run_correction`, so approval and correction times also can't be
   backdated.
6. **Live behavior is checked by hand and recorded.** A read-only check script
   (`studio/supabase/checks/audit-integrity-check.sql`) attempts each forbidden write as a signed-in
   user inside a transaction that is then undone. Val runs it in the Supabase SQL editor after
   applying the migration with "Run without RLS." The result goes in the handover log.
7. **One honest protection statement.** The plain-language "How this record is protected" text
   (card "Ensure audit entries can't be silently altered", US7) lives once, in
   `lib/domain/audit-events.ts`. It claims only what points 1–5 enforce, and says that
   database-administrator edits aren't detected.
8. **Logged as follow-ups, not built:**
   - **A protected write path** (writes allowed only through one database function), so a member
     can't record a plausible entry under their own name. It's a follow-up for Lane A because it
     changes `writeAuditEvent`.
   - **Delete behavior.** Today, deleting a run or person would blank the matching links in the
     trail (`task_run_id` / `actor` are `on delete set null`). Any future delete feature must decide
     this first.

## Alternatives considered

- **A database trigger that overwrites the time and actor** — rejected. It hides a wrong write
  instead of refusing it, so a bug crediting the wrong person would vanish quietly. The spec says
  refuse.
- **A protected write function or the server-only key for all audit writes** — deferred, not
  rejected. It's the strongest option, but it means editing Lane A's `writeAuditEvent` and its 7
  callers, and widening the server-only key would go against ADR-0013's "narrow server-only paths."
  Logged as a follow-up.
- **A database enum type for `event_type`** — rejected. Enum values can't be removed, and adding them
  is awkward inside migrations. A check rule is replaced in one statement.
- **A hash chain (tamper-detection)** — rejected for 1b. It guards against administrators only (Val
  and the hosting provider), needs a verifier, and adds complexity no current requirement asks for.
  Revisit at MMP or when there are multi-admin organizations. The statement discloses the gap
  instead.
- **Running database behavior tests in CI (local database or pgTAP)** — rejected. It needs a
  database and Docker in CI, which breaks the credential-free, low-minute gate (ADR-0016). Static
  checks plus a recorded manual check fit the current setup.
- **Checking existing rows against the kind list immediately** — rejected as the default. If any old
  row has an unexpected kind, the migration would fail mid-apply. Enforce new entries first, then
  confirm history live.

## Consequences

- **Positive:**
  - Entries can no longer be backdated, credited to someone else, attached to another
    organization's run, or given an invented kind.
  - The event log now matches the approval and correction pattern.
  - Approval and correction times are protected too.
  - A static check now fails any migration that tries to undo the append-only protection.
  - The trail and the export share one list of event kinds and one protection statement.
  - No pipeline or Lane A file changes.
- **Negative:**
  - **A refused write is lost silently.** If any writer ever passes a person other than the
    signed-in user, or a new kind isn't added to the list, `writeAuditEvent` drops the entry with
    only a console log. Mitigated by the one-by-one tests of all 11 kinds and the live check, and
    the audit trail's "record missing" marker makes the gap visible. The real fix is Lane A's.
  - **Adding a kind of event now needs a migration.** Lane A's ADR-0025 changes a payload, not a
    kind, so it isn't affected, but future kinds must coordinate.
  - **A member can still record a plausible entry under their own name** until the protected write
    path exists.
  - **Database-administrator edits stay undetected.**
  - **Live behavior is verified by hand**, not on every push.
- **Neutral:**
  - No change to the shape of the event log or what it stores.
  - Old entries aren't re-checked against the kind list unless the live check shows they comply.
  - The org-wide read rule is unchanged.
