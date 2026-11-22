import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0030 point 8: every AI request is counted only through claim_ai_request, and app users can
// never read, add, change or delete the counter rows directly (otherwise a member could reset their
// own limit). After every migration: (a) neither app role holds any privilege on ai_request, (b)
// row-level security is on and no policy opens it, (c) logged-out users can't call the function,
// and (d) the function still repeats its own checks and keeps every limit, including the platform
// ceiling. PenTest F-02 · SR-02 / SR-03.
//
// CI has no database (ADR-0016), so — like review-integrity.test.ts, whose replay this copies
// (a shared helper is a tracked follow-up) — this replays the migrations in filename order. It is
// CONSERVATIVE: a new table starts with every privilege granted to both app roles (the default
// privileges in 20261112010000_rls_policies.sql), and a new function starts with EXECUTE granted to
// PUBLIC (Postgres' default), so the test only passes when each one was explicitly revoked. Live
// behavior is checked separately by supabase/checks/rate-limit-check.sql.

const APP_ROLES = ['authenticated', 'anon'] as const;
const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;
const TABLE = 'ai_request';
const FN = 'claim_ai_request';

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
 * on new functions (our understanding of its default privileges), so only naming the role removes
 * it. Modelling this strictly means a migration that revokes from `public` alone still fails.
 */
function roles(list: string, verb: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  const named = names.filter((r) => r !== 'public');
  return verb === 'grant' && names.includes('public') ? [...APP_ROLES] : named;
}

/** "public.ai_request" / "table ai_request" -> "ai_request"; functions -> "fn:name". */
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

/** Every way the replayed state lets an app user touch the counter directly. Empty = safe. */
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
  if (state.privs.get(`fn:${FN}:anon`)?.get('execute')?.table) leaks.push(`anon can call ${FN}`);
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
    ['auth.uid()', 'does not check who is signed in'],
    ['public.current_org_id()', 'does not take the org from current_org_id()'],
    ['pg_advisory_xact_lock', 'does not lock per user'],
    ["'user_minute'", 'lost the per-user minute limit'],
    ["'user_day'", 'lost the per-user day limit'],
    ["'org_day'", 'lost the per-org day limit'],
    ["'platform_day'", 'lost the platform day limit'],
  ];
  for (const [needle, message] of must) if (!body.includes(needle)) leaks.push(`${FN} ${message}`);
  // The limit numbers live here (ADR-0030 point 3); none may be dropped or loosened silently.
  for (const n of ['10', '200', '1000', '5000'])
    if (!new RegExp(`v_limit_\\w+ constant int := ${n};`).test(body))
      leaks.push(`${FN} limit ${n} changed or missing`);
  // The limits must never come from the caller (ADR-0030 alternatives: "limits sent from the app").
  const header = body.slice(0, body.indexOf(')'));
  if (/limit/.test(header)) leaks.push(`${FN} takes a limit as an argument`);
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

describe('AI requests are counted only through claim_ai_request (ADR-0030)', () => {
  it('after all migrations, app users cannot touch the counter rows directly', () => {
    expect(counterLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('the protected function repeats its own checks and keeps every limit', () => {
    expect(functionLeaks(joined(repoMigrations()))).toEqual([]);
  });

  // Mutation checks: prove the test actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration lets members read the counter', () => {
    expect(
      counterLeaks(
        replay([...repoMigrations(), later('grant select on public.ai_request to authenticated;')]),
      ),
    ).toContain('authenticated can select ai_request');
  });

  it('fails if a later migration lets members delete counter rows (resetting their limit)', () => {
    expect(
      counterLeaks(
        replay([...repoMigrations(), later('grant delete on public.ai_request to authenticated;')]),
      ),
    ).toContain('authenticated can delete ai_request');
  });

  it('fails if a later migration gives a column-level insert on the counter', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('grant insert (kind) on public.ai_request to authenticated;'),
        ]),
      ),
    ).toContain('authenticated can insert ai_request');
  });

  it('fails if a later migration turns row-level security off', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('alter table public.ai_request disable row level security;'),
        ]),
      ),
    ).toContain('ai_request has row-level security off');
  });

  it('fails if a later migration adds a policy on the counter', () => {
    const bad = later(
      'create policy "ai_request_select_org" on public.ai_request for select to authenticated ' +
        'using (org_id = public.current_org_id());',
    );
    expect(counterLeaks(replay([...repoMigrations(), bad]))).toContain(
      'unexpected ai_request policy ai_request_select_org',
    );
  });

  it('fails if a later migration lets logged-out users call the function', () => {
    expect(
      counterLeaks(
        replay([
          ...repoMigrations(),
          later('grant execute on function public.claim_ai_request(text) to anon;'),
        ]),
      ),
    ).toContain('anon can call claim_ai_request');
  });

  it('fails if the function is revoked only from public, not from anon by name', () => {
    const fnOnly = [
      {
        name: '1.sql',
        sql:
          "create or replace function public.claim_ai_request(p_kind text) returns text as $$ select 'ok'; $$; " +
          'revoke all on function public.claim_ai_request(text) from public;',
      },
    ];
    expect(counterLeaks(replay(fnOnly))).toContain('anon can call claim_ai_request');
  });

  it('assumes a new table is open to app users unless a migration revokes it', () => {
    const onlyCreate = [{ name: '1.sql', sql: 'create table public.ai_request (id uuid);' }];
    expect(counterLeaks(replay(onlyCreate))).toContain('authenticated can delete ai_request');
  });

  it('fails if a later redefinition drops the platform ceiling', () => {
    const current = joined(repoMigrations());
    const fnStart = current
      .toLowerCase()
      .lastIndexOf('create or replace function public.claim_ai_request');
    const fnEnd = current.indexOf('$$;', fnStart) + 3;
    const weakened = current
      .slice(fnStart, fnEnd)
      .replace(
        /v_limit_platform_day constant int := 5000;/i,
        'v_limit_platform_day constant int := 999999;',
      );
    expect(functionLeaks(current + '\n' + weakened)).toContain(
      'claim_ai_request limit 5000 changed or missing',
    );
  });

  it('fails if a later redefinition takes the limit from the caller', () => {
    const bad =
      'create or replace function public.claim_ai_request(p_kind text, p_limit int) returns text ' +
      "language plpgsql security definer set search_path = '' as $$ begin return 'ok'; end; $$;";
    expect(functionLeaks(joined(repoMigrations()) + '\n' + bad)).toContain(
      'claim_ai_request takes a limit as an argument',
    );
  });
});
