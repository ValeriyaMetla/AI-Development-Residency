import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AUDIT_EVENT_TYPES,
  AUDIT_PROTECTION_STATEMENT,
  isAuditEventType,
} from '@/lib/domain/audit-events';

// ADR-0026 point 3: ONE list of audit event kinds. The database check constraint, the Domain list,
// and every kind the code actually writes must agree — otherwise a legitimate write is refused by
// the database and silently dropped by writeAuditEvent (ADR-0026, Consequences: Negative).
// Static (reads files), so it runs in credential-free CI (ADR-0016).

const MIGRATIONS_DIR = 'supabase/migrations';

/** The kinds allowed by the LATEST migration that (re)defines `audit_event_known_type`. */
function constraintKinds(): string[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  let latest: string | null = null;
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (/add constraint audit_event_known_type/i.test(sql)) latest = sql;
  }
  if (!latest) throw new Error('no migration defines audit_event_known_type');
  const match = latest.match(
    /add constraint audit_event_known_type[\s\S]*?event_type in \(([\s\S]*?)\)/i,
  );
  if (!match) throw new Error('could not read the audit_event_known_type list');
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

/** Every .ts file under a directory (tests excluded). */
function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return /\.tsx?$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

/** Every string literal passed as `eventType:` (incl. both arms of a ternary) in lib/ and app/. */
function writtenKinds(): string[] {
  const kinds = new Set<string>();
  for (const file of [...tsFiles('lib'), ...tsFiles('app')]) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/eventType:([^\n]*)/g)) {
      // In a ternary, only the result arms are kinds — not the literal being compared against.
      const expr = m[1].includes('?') ? m[1].slice(m[1].indexOf('?')) : m[1];
      for (const lit of expr.matchAll(/'([a-z_]+)'/g)) kinds.add(lit[1]);
    }
  }
  return [...kinds];
}

describe('audit event kinds — one list (ADR-0026 §3)', () => {
  it('the Domain list has no duplicates', () => {
    expect(new Set(AUDIT_EVENT_TYPES).size).toBe(AUDIT_EVENT_TYPES.length);
  });

  it('the database check constraint allows exactly the Domain list', () => {
    expect([...constraintKinds()].sort()).toEqual([...AUDIT_EVENT_TYPES].sort());
  });

  it('every kind the code writes is in the list', () => {
    const written = writtenKinds();
    // Guard against the scan silently finding nothing (e.g. a refactor renames the field).
    expect(written.length).toBeGreaterThanOrEqual(10);
    const missing = written.filter((k) => !isAuditEventType(k));
    expect(missing).toEqual([]);
  });

  it('isAuditEventType accepts known kinds and rejects anything else', () => {
    for (const kind of AUDIT_EVENT_TYPES) expect(isAuditEventType(kind)).toBe(true);
    for (const other of ['', 'made_up', 'TASK_COMPLETED', 'task_completed ']) {
      expect(isAuditEventType(other)).toBe(false);
    }
  });
});

describe('protection statement — honest, never overclaiming (card 2 US7)', () => {
  it('names the gap it does not close', () => {
    expect(AUDIT_PROTECTION_STATEMENT).toMatch(/administrator access/);
    expect(AUDIT_PROTECTION_STATEMENT).toMatch(/doesn’t yet detect/);
  });

  it('makes no absolute claims', () => {
    const lower = AUDIT_PROTECTION_STATEMENT.toLowerCase();
    for (const overclaim of [
      'tamper-proof',
      'tamperproof',
      'guarantee',
      'impossible',
      'no one can',
    ]) {
      expect(lower).not.toContain(overclaim);
    }
  });
});
