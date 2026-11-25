import { describe, expect, it } from 'vitest';
import {
  APP_ROLES,
  TABLE_PRIVS,
  policiesForTable,
  replay,
  repoMigrations,
  type Migration,
  type State,
} from './support/migration-replay';

// ADR-0037: failed logins are throttled by two locked tables (login_lock per account, login_attempt
// per IP) and two anon-callable functions (login_guard before the password check, login_record
// after). This static check runs with no database (CI is credential-free, ADR-0016) and replays the
// migrations through the shared model in ./support/migration-replay (CONSERVATIVE, and strict about
// REVOKE ... FROM public). It asserts, after every migration:
//   (a) neither app role can touch either table, RLS is on, and no policy opens them;
//   (b) each function keeps security definer, the pinned search_path, hashing, and its limits
//       (5 / 15 minutes / 20), and the doubling formula;
//   (c) both functions stay callable by anon (sign-in is pre-login) — asserted, not flagged.
// Live behaviour is checked separately by supabase/checks/login-lockout-check.sql. PenTest F-04.

const TABLES = ['login_lock', 'login_attempt'] as const;
const FNS = ['login_guard', 'login_record'] as const;

/** Every way an app user could touch the lockout tables, or a function losing its anon grant. */
export function lockoutLeaks(state: State): string[] {
  const leaks: string[] = [];
  for (const table of TABLES) {
    for (const role of APP_ROLES) {
      const byPriv = state.privs.get(`${table}:${role}`);
      for (const priv of TABLE_PRIVS) {
        const gr = byPriv?.get(priv);
        if (gr?.table || (gr?.columns.size ?? 0) > 0) leaks.push(`${role} can ${priv} ${table}`);
      }
    }
    if (!state.rls.has(table)) leaks.push(`${table} has row-level security off`);
    for (const p of policiesForTable(state, table))
      leaks.push(`unexpected ${table} policy ${p.name}`);
  }
  // Sign-in is pre-login, so anon MUST keep EXECUTE on both functions, else sign-in breaks.
  for (const fn of FNS)
    if (!state.privs.get(`fn:${fn}:anon`)?.get('execute')?.table)
      leaks.push(`anon can no longer call ${fn} (sign-in would break)`);
  return leaks;
}

function fnBody(allSql: string, fn: string): string | null {
  const sql = allSql.toLowerCase();
  const start = sql.lastIndexOf(`create or replace function public.${fn}`);
  if (start === -1) return null;
  const bodyEnd = sql.indexOf('$$;', sql.indexOf('as $$', start));
  return sql.slice(start, bodyEnd);
}

/** Each function must still make its own checks and keep its limits. Empty = safe. */
export function functionLeaks(allSql: string): string[] {
  const leaks: string[] = [];
  const common: [string, string][] = [
    ['security definer', 'does not run as security definer'],
    ["set search_path = ''", 'does not pin search_path'],
    ['digest(', 'does not hash its inputs'],
    ["'sha256'", 'does not hash with sha256'],
  ];
  for (const fn of FNS) {
    const body = fnBody(allSql, fn);
    if (body === null) {
      leaks.push(`${fn} is missing`);
      continue;
    }
    for (const [needle, msg] of common) if (!body.includes(needle)) leaks.push(`${fn} ${msg}`);
  }
  const guard = fnBody(allSql, 'login_guard');
  if (guard && !guard.includes("'locked'")) leaks.push('login_guard lost the locked outcome');
  if (guard && !/v_ip_limit constant int := 20;/.test(guard))
    leaks.push('login_guard IP limit (20) changed or missing');
  const record = fnBody(allSql, 'login_record');
  if (record && !/v_account_limit constant int := 5;/.test(record))
    leaks.push('login_record account limit (5) changed or missing');
  if (record && !record.includes("interval '15 minutes'"))
    leaks.push('login_record lost the 15-minute base lockout');
  if (record && !record.includes('power(2')) leaks.push('login_record lost the doubling');
  return leaks;
}

const joined = (ms: Migration[]) =>
  [...ms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => m.sql)
    .join('\n');

const later = (sql: string): Migration => ({ name: '29990101000000_bad.sql', sql });

describe('Failed logins are throttled per account and per IP (ADR-0037)', () => {
  it('after all migrations, app users cannot touch either lockout table', () => {
    expect(lockoutLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('both functions keep their checks, limits and the doubling', () => {
    expect(functionLeaks(joined(repoMigrations()))).toEqual([]);
  });

  it('fails if a later migration lets members read login_lock', () => {
    expect(
      lockoutLeaks(
        replay([...repoMigrations(), later('grant select on public.login_lock to authenticated;')]),
      ),
    ).toContain('authenticated can select login_lock');
  });

  it('fails if a later migration lets members delete login_attempt (clearing the IP count)', () => {
    expect(
      lockoutLeaks(
        replay([
          ...repoMigrations(),
          later('grant delete on public.login_attempt to authenticated;'),
        ]),
      ),
    ).toContain('authenticated can delete login_attempt');
  });

  it('fails if a later migration turns RLS off on login_lock', () => {
    expect(
      lockoutLeaks(
        replay([
          ...repoMigrations(),
          later('alter table public.login_lock disable row level security;'),
        ]),
      ),
    ).toContain('login_lock has row-level security off');
  });

  it('fails if a later migration revokes anon EXECUTE on login_guard (sign-in would break)', () => {
    expect(
      lockoutLeaks(
        replay([
          ...repoMigrations(),
          later('revoke execute on function public.login_guard(text, text) from anon;'),
        ]),
      ),
    ).toContain('anon can no longer call login_guard (sign-in would break)');
  });

  it('fails if a later redefinition loosens the per-account limit', () => {
    const current = joined(repoMigrations());
    const weakened = current.replace(
      /v_account_limit constant int := 5;/i,
      'v_account_limit constant int := 9999;',
    );
    expect(functionLeaks(weakened)).toContain('login_record account limit (5) changed or missing');
  });

  it('fails if a later redefinition drops the doubling', () => {
    const current = joined(repoMigrations());
    const weakened = current.replace(/power\(2, v_lock_level\)/i, '1');
    expect(functionLeaks(weakened)).toContain('login_record lost the doubling');
  });
});
