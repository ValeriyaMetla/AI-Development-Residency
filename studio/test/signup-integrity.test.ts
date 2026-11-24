import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0034: sign-ups are limited by name-length CHECK constraints and one protected per-IP counter.
// This static check runs with no database (CI is credential-free, ADR-0016), so — like
// rate-limit-integrity.test.ts, whose replay this copies (a shared helper is Stream B's follow-up) —
// it replays the migrations in filename order and asserts, after every migration:
//   (a) neither app role holds any privilege on signup_attempt, RLS is on, and no policy opens it
//       (otherwise a member could read or reset the per-IP counter);
//   (b) the counter function still makes its own checks and keeps the 5/hour limit, and never takes
//       the limit from the caller;
//   (c) UNLIKE the AI counter, claim_signup_attempt IS callable by anon — sign-up happens before
//       login — so the test asserts that grant stays, rather than flagging it; and
//   (d) both name-length constraints are still present.
// Live behavior is checked separately by supabase/checks/signup-rate-limit-check.sql.
// PenTest F-07 · SR-11 / SR-12.

const APP_ROLES = ['authenticated', 'anon'] as const;
const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;
const TABLE = 'signup_attempt';
const FN = 'claim_signup_attempt';

type Migration = { name: string; sql: string };
type Grant = { table: boolean; columns: Set<string> };
type State = {
  privs: Map<string, Map<string, Grant>>; // "object:role" -> privilege -> grant
  policies: Set<string>; // "table:name"
  rls: Set<string>; // tables with row-level security enabled
};

/** Top-level SQL statements: comments stripped, $$ bodies kept whole, lower-cased, collapsed. */
function statements(sql: string): string[] {
  const noComments = sql.replace(/--[^\n]*/g, '');
  const out: string[] = [];
  let current = '';
  let inBody = false;
  for (let i = 0; i < noComments.length; i++) {
    if (noComments.startsWith('$$', i)) {
      inBody = !inBody;
      current += '$$';
      i++;
      continue;
    }
    const ch = noComments[i];
    if (ch === ';' && !inBody) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
}

/** Split a privilege list on commas that are not inside a column list. */
function splitPrivileges(list: string): { priv: string; columns: string[] | null }[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => {
    const m = p.trim().match(/^([a-z ]+?)\s*(?:\((.*)\))?$/);
    const priv = (m?.[1] ?? p).trim();
    const columns = m?.[2] ? m[2].split(',').map((c) => c.trim()) : null;
    return { priv, columns };
  });
}

/**
 * Roles a GRANT / REVOKE reaches. GRANT ... TO public reaches every app role. REVOKE ... FROM public
 * does NOT remove a role's own grant: Supabase grants `anon` and `authenticated` their own EXECUTE
 * on new functions, so only naming the role removes it. Modelling this strictly means a migration
 * that revokes from `public` alone still leaves each role's own grant in place.
 */
function roles(list: string, verb: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  const named = names.filter((r) => r !== 'public');
  return verb === 'grant' && names.includes('public') ? [...APP_ROLES] : named;
}

/** "public.signup_attempt" / "table signup_attempt" -> "signup_attempt"; functions -> "fn:name". */
function objectKey(target: string): string {
  const fn = target.match(/^function (?:public\.)?(\w+)/);
  if (fn) return `fn:${fn[1]}`;
  return target.replace(/^table /, '').replace(/^public\./, '');
}

function grantFor(state: State, object: string, role: string, priv: string): Grant {
  const key = `${object}:${role}`;
  const byPriv = state.privs.get(key) ?? new Map<string, Grant>();
  state.privs.set(key, byPriv);
  const g = byPriv.get(priv) ?? { table: false, columns: new Set<string>() };
  byPriv.set(priv, g);
  return g;
}

/** Replays every migration and returns the final privileges, policies and RLS switches. */
export function replay(migrations: Migration[]): State {
  const state: State = { privs: new Map(), policies: new Set(), rls: new Set() };
  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));

  for (const { sql } of sorted) {
    for (const stmt of statements(sql)) {
      const table = stmt.match(/^create table (?:if not exists )?(?:public\.)?(\w+)/);
      if (table) {
        for (const role of APP_ROLES)
          for (const p of TABLE_PRIVS) grantFor(state, table[1], role, p).table = true;
        continue;
      }
      const fn = stmt.match(/^create (?:or replace )?function (?:public\.)?(\w+)/);
      if (fn) {
        for (const role of APP_ROLES) grantFor(state, `fn:${fn[1]}`, role, 'execute').table = true;
        continue;
      }
      const rls = stmt.match(
        /^alter table (?:if exists )?(?:only )?(?:public\.)?(\w+) (enable|disable) row level security/,
      );
      if (rls) {
        if (rls[2] === 'enable') state.rls.add(rls[1]);
        else state.rls.delete(rls[1]);
        continue;
      }
      const pol = stmt.match(/^create policy "([^"]+)" on (?:public\.)?(\w+)/);
      if (pol) {
        state.policies.add(`${pol[2]}:${pol[1]}`);
        continue;
      }
      const dropPol = stmt.match(/^drop policy (?:if exists )?"([^"]+)" on (?:public\.)?(\w+)/);
      if (dropPol) {
        state.policies.delete(`${dropPol[2]}:${dropPol[1]}`);
        continue;
      }
      const g = stmt.match(
        /^(grant|revoke) (.+?) on (.+?) (to|from) ([a-z_, ]+?)(?: with grant option| cascade)?$/,
      );
      if (!g) continue;
      const [, verb, privList, target, , roleList] = g;
      const object = objectKey(target);
      for (const role of roles(roleList, verb)) {
        for (const { priv, columns } of splitPrivileges(privList)) {
          const names =
            priv === 'all' || priv === 'all privileges'
              ? object.startsWith('fn:')
                ? ['execute']
                : [...TABLE_PRIVS]
              : [priv];
          for (const name of names) {
            const grant = grantFor(state, object, role, name);
            if (verb === 'grant') {
              if (columns) columns.forEach((c) => grant.columns.add(c));
              else grant.table = true;
            } else if (columns) {
              columns.forEach((c) => grant.columns.delete(c));
            } else {
              grant.table = false; // a table-level REVOKE also clears that privilege's columns
              grant.columns.clear();
            }
          }
        }
      }
    }
  }
  return state;
}

/** Every way the replayed state lets an app user touch the counter rows directly. Empty = safe. */
export function counterLeaks(state: State): string[] {
  const leaks: string[] = [];
  for (const role of APP_ROLES) {
    const byPriv = state.privs.get(`${TABLE}:${role}`);
    for (const priv of TABLE_PRIVS) {
      const g = byPriv?.get(priv);
      if (g?.table || (g?.columns.size ?? 0) > 0) leaks.push(`${role} can ${priv} ${TABLE}`);
    }
  }
  if (!state.rls.has(TABLE)) leaks.push(`${TABLE} has row-level security off`);
  for (const p of state.policies)
    if (p.startsWith(`${TABLE}:`)) leaks.push(`unexpected ${TABLE} policy ${p.split(':')[1]}`);
  // Sign-up is pre-login, so anon MUST keep EXECUTE on the function. Flag it only if that grant was
  // lost, which would break sign-up for logged-out visitors (the opposite failure to the AI gate).
  if (!state.privs.get(`fn:${FN}:anon`)?.get('execute')?.table)
    leaks.push(`anon can no longer call ${FN} (sign-up would break)`);
  return leaks;
}

/** The latest definition of the function must still make every check itself. Empty = safe. */
export function functionLeaks(allSql: string): string[] {
  const sql = allSql.toLowerCase();
  const start = sql.lastIndexOf(`create or replace function public.${FN}`);
  if (start === -1) return [`${FN} is missing`];
  const bodyEnd = sql.indexOf('$$;', sql.indexOf('as $$', start));
  const body = sql.slice(start, bodyEnd);
  const leaks: string[] = [];
  const must: [string, string][] = [
    ['security definer', 'does not run as security definer'],
    ["set search_path = ''", 'does not pin search_path'],
    ['pg_advisory_xact_lock', 'does not lock per IP'],
    ['digest(', 'does not hash the IP'],
    ["'sha256'", 'does not hash the IP with sha256'],
    ["'ip_hour'", 'lost the per-IP hour limit'],
  ];
  for (const [needle, message] of must) if (!body.includes(needle)) leaks.push(`${FN} ${message}`);
  // The limit number lives here (ADR-0034 point 6); it may not be dropped or loosened silently.
  if (!/v_limit_ip_hour constant int := 5;/.test(body))
    leaks.push(`${FN} limit 5 changed or missing`);
  // The limit must never come from the caller (ADR-0030/0034: "limits sent from the app").
  const header = body.slice(0, body.indexOf(')'));
  if (/limit/.test(header)) leaks.push(`${FN} takes a limit as an argument`);
  return leaks;
}

/** Both SR-11 name-length constraints must still be present across the migrations. Empty = safe. */
export function constraintLeaks(allSql: string): string[] {
  const sql = allSql.toLowerCase().replace(/\s+/g, ' ');
  const leaks: string[] = [];
  if (!/add constraint org_name_len check \(char_length\(name\) <= 120\)/.test(sql))
    leaks.push('org.name 120-char limit missing (SR-11)');
  if (
    !/add constraint profile_display_name_len check \(display_name is null or char_length\(display_name\) <= 80\)/.test(
      sql,
    )
  )
    leaks.push('profile.display_name 80-char limit missing (SR-11)');
  return leaks;
}

function repoMigrations(): Migration[] {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

const joined = (ms: Migration[]) =>
  [...ms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => m.sql)
    .join('\n');

const later = (sql: string): Migration => ({ name: '29990101000000_bad.sql', sql });

describe('Sign-ups are limited by name constraints and a protected per-IP counter (ADR-0034)', () => {
  it('after all migrations, app users cannot touch the counter rows directly', () => {
    expect(counterLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('the protected function repeats its own checks and keeps the 5/hour limit', () => {
    expect(functionLeaks(joined(repoMigrations()))).toEqual([]);
  });

  it('both name-length constraints are present', () => {
    expect(constraintLeaks(joined(repoMigrations()))).toEqual([]);
  });

  // Mutation checks: prove the test actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration lets members read the counter', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('grant select on public.signup_attempt to authenticated;'),
        ]),
      ),
    ).toContain('authenticated can select signup_attempt');
  });

  it('fails if a later migration lets members delete counter rows (resetting the IP limit)', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('grant delete on public.signup_attempt to authenticated;'),
        ]),
      ),
    ).toContain('authenticated can delete signup_attempt');
  });

  it('fails if a later migration turns row-level security off', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('alter table public.signup_attempt disable row level security;'),
        ]),
      ),
    ).toContain('signup_attempt has row-level security off');
  });

  it('fails if a later migration adds a policy on the counter', () => {
    const bad = later(
      'create policy "signup_attempt_read" on public.signup_attempt for select to authenticated ' +
        'using (true);',
    );
    expect(counterLeaks(replay([...repoMigrations(), bad]))).toContain(
      'unexpected signup_attempt policy signup_attempt_read',
    );
  });

  it('fails if a later migration revokes anon EXECUTE (which would break sign-up)', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('revoke execute on function public.claim_signup_attempt(text) from anon;'),
        ]),
      ),
    ).toContain('anon can no longer call claim_signup_attempt (sign-up would break)');
  });

  it('assumes a new table is open to app users unless a migration revokes it', () => {
    const onlyCreate = [{ name: '1.sql', sql: 'create table public.signup_attempt (id uuid);' }];
    expect(counterLeaks(replay(onlyCreate))).toContain('authenticated can delete signup_attempt');
  });

  it('fails if a later redefinition loosens the 5/hour limit', () => {
    const current = joined(repoMigrations());
    const fnStart = current
      .toLowerCase()
      .lastIndexOf('create or replace function public.claim_signup_attempt');
    const fnEnd = current.indexOf('$$;', fnStart) + 3;
    const weakened = current
      .slice(fnStart, fnEnd)
      .replace(/v_limit_ip_hour constant int := 5;/i, 'v_limit_ip_hour constant int := 999;');
    expect(functionLeaks(current + '\n' + weakened)).toContain(
      'claim_signup_attempt limit 5 changed or missing',
    );
  });

  it('fails if a later redefinition takes the limit from the caller', () => {
    const bad =
      'create or replace function public.claim_signup_attempt(p_ip text, p_limit int) returns text ' +
      "language plpgsql security definer set search_path = '' as $$ begin return 'ok'; end; $$;";
    expect(functionLeaks(joined(repoMigrations()) + '\n' + bad)).toContain(
      'claim_signup_attempt takes a limit as an argument',
    );
  });

  it('fails if a later migration drops the org name constraint', () => {
    // constraintLeaks scans for the ADD; simulate its removal by replacing it in the joined SQL.
    const current = joined(repoMigrations()).replace(
      /add constraint org_name_len check \(char_length\(name\) <= 120\)/i,
      'add constraint org_name_len check (char_length(name) <= 999999)',
    );
    expect(constraintLeaks(current)).toContain('org.name 120-char limit missing (SR-11)');
  });
});
