import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0026 point 4: the governed record stays append-only. App users (authenticated, anon) must end
// up with NO update / delete / truncate on the three record tables, whatever later migrations do.
//
// CI has no database (ADR-0016), so this replays the migrations' GRANT / REVOKE statements in
// filename order. It is deliberately CONSERVATIVE: a table is assumed to start with every privilege
// granted to both app roles (Supabase's platform default — which is how TRUNCATE slipped through
// before 20261118040000), and `alter default privileges` statements are ignored. So it only passes
// when each privilege was explicitly revoked. Live behavior is checked separately by
// supabase/checks/audit-integrity-check.sql.

const PROTECTED_TABLES = ['audit_event', 'approval', 'run_correction'] as const;
const APP_ROLES = ['authenticated', 'anon'] as const;
const FORBIDDEN = ['update', 'delete', 'truncate'] as const;

type Migration = { name: string; sql: string };
type Held = Map<string, Set<string>>; // "table:role" -> privileges held

/** SQL statements, comments stripped, whitespace collapsed, lower-cased. */
function statements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(Boolean);
}

/** Privileges named in a GRANT/REVOKE list; column lists are dropped; ALL = every forbidden one. */
function privileges(list: string): string[] {
  const names = list
    .replace(/\([^)]*\)/g, '')
    .split(',')
    .map((p) => p.trim());
  return names.some((p) => p === 'all' || p === 'all privileges') ? [...FORBIDDEN] : names;
}

/** Roles in a TO/FROM list; PUBLIC covers both app roles. */
function roles(list: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  return names.includes('public') ? [...APP_ROLES] : names;
}

/** Replays the migrations and returns every forbidden privilege an app role still holds. */
export function remainingForbidden(migrations: Migration[]): string[] {
  const held: Held = new Map();
  const created = new Set<string>();
  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));

  for (const { sql } of sorted) {
    for (const stmt of statements(sql)) {
      const create = stmt.match(/^create table (?:if not exists )?(?:public\.)?(\w+)/);
      if (create) {
        created.add(create[1]);
        for (const role of APP_ROLES) held.set(`${create[1]}:${role}`, new Set(FORBIDDEN));
        continue;
      }
      const g = stmt.match(
        /^(grant|revoke) (.+?) on (.+?) (to|from) (.+?)(?: with grant option| cascade)?$/,
      );
      if (!g) continue; // alter default privileges, policies, etc. — ignored (conservative)
      const [, verb, privList, target, , roleList] = g;
      const tables =
        target === 'all tables in schema public'
          ? [...created]
          : [target.replace(/^table /, '').replace(/^public\./, '')];
      for (const table of tables) {
        for (const role of roles(roleList)) {
          const key = `${table}:${role}`;
          const set = held.get(key) ?? new Set<string>();
          for (const p of privileges(privList)) {
            if (verb === 'grant') set.add(p);
            else set.delete(p);
          }
          held.set(key, set);
        }
      }
    }
  }

  const leaks: string[] = [];
  for (const table of PROTECTED_TABLES) {
    for (const role of APP_ROLES) {
      for (const p of FORBIDDEN) {
        if (held.get(`${table}:${role}`)?.has(p)) leaks.push(`${role} can ${p} ${table}`);
      }
    }
  }
  return leaks;
}

function repoMigrations(): Migration[] {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

describe('the governed record stays append-only (ADR-0026 §4)', () => {
  it('every protected table is created by a migration', () => {
    const all = repoMigrations()
      .map((m) => m.sql.toLowerCase())
      .join('\n');
    for (const table of PROTECTED_TABLES)
      expect(all).toMatch(new RegExp(`create table ${table}\\b`));
  });

  it('after all migrations, app users cannot update, delete or truncate any protected table', () => {
    expect(remainingForbidden(repoMigrations())).toEqual([]);
  });

  // Mutation checks: prove the replay actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration re-grants UPDATE on the audit log', () => {
    const bad = {
      name: '29990101000000_bad.sql',
      sql: 'grant update on public.audit_event to authenticated;',
    };
    expect(remainingForbidden([...repoMigrations(), bad])).toEqual([
      'authenticated can update audit_event',
    ]);
  });

  it('fails if a later migration grants ALL on every table', () => {
    const bad = {
      name: '29990101000000_bad.sql',
      sql: 'grant all on all tables in schema public to anon;',
    };
    const leaks = remainingForbidden([...repoMigrations(), bad]);
    expect(leaks).toContain('anon can truncate approval');
    expect(leaks).toContain('anon can delete run_correction');
  });

  it('assumes nothing is revoked unless a migration says so', () => {
    const onlyCreate = [{ name: '1.sql', sql: 'create table audit_event (id uuid);' }];
    expect(remainingForbidden(onlyCreate)).toContain('anon can truncate audit_event');
  });
});
