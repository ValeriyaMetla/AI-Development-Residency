// Shared migration-replay model for the static database-permission tests
// (ADR-0035 / PenTest F-17 / SR-23; the "shared helper" follow-up the integrity tests reference).
//
// CI has no database (ADR-0016), so these tests replay the migration files as text and read the
// resulting privileges, row-level-security state, policies and indexes. This module is the ONE model
// those tests share, so the Postgres rules below are stated once instead of copied into each file.
//
// It is deliberately CONSERVATIVE — it assumes the worst unless a migration explicitly closes it, so
// a test only passes when the lock-down is real in the SQL:
//   - a new table starts with every privilege granted to both app roles (the project default
//     privileges in 20261112010000_rls_policies.sql);
//   - a new function starts with EXECUTE granted to PUBLIC (Postgres' default);
//   - a table-level REVOKE also clears that privilege's column grants;
//   - a column-level REVOKE leaves any table-level grant in place.
//
// REVOKE ... FROM public is modelled STRICTLY: it does NOT remove a role's own grant. Supabase grants
// `anon` and `authenticated` their own privileges (our reading of its default privileges), so only
// naming a role removes it — a migration that revokes from `public` alone still leaves each role's own
// access, and the test still fails. Modelling this loosely (treating a revoke-from-public as cleaning
// up every role) is the exact false-negative ADR-0035 warns about: it can pass CI and still be wrong
// live. Live behaviour is proven separately by the hand-run supabase/checks/*.sql scripts.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The two Supabase application roles an app user ever acts as. */
export const APP_ROLES = ['authenticated', 'anon'] as const;

/** Table privileges Postgres grants by default, which a lock-down must revoke. */
export const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;

export type Migration = { name: string; sql: string };

/** A privilege holding: a whole-object (table/function) grant and/or specific column grants. */
export type Grant = { table: boolean; columns: Set<string> };

/** One row-level-security policy, keyed in State by "table:command:name". */
export type PolicyInfo = { table: string; command: string; name: string; statement: string };

export type State = {
  /** "object:role" -> privilege -> grant. Objects are a bare table name or "fn:<name>". */
  privs: Map<string, Map<string, Grant>>;
  /** "table:command:name" -> the policy, including its full (lower-cased) statement for USING/CHECK. */
  policies: Map<string, PolicyInfo>;
  /** Tables with row-level security enabled. */
  rls: Set<string>;
  /** "table:index" for unique indexes still in place. */
  indexes: Set<string>;
};

/** Top-level SQL statements: comments stripped, $$ bodies kept whole, lower-cased, collapsed. */
export function statements(sql: string): string[] {
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
export function splitPrivileges(list: string): { priv: string; columns: string[] | null }[] {
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
 * Roles a GRANT / REVOKE reaches. GRANT ... TO public reaches every app role; REVOKE ... FROM public
 * removes no role's own grant (it drops only the PUBLIC grant), so it returns just the named roles.
 */
export function roles(list: string, verb: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  const named = names.filter((r) => r !== 'public');
  return verb === 'grant' && names.includes('public') ? [...APP_ROLES] : named;
}

/** "public.task_run" / "table task_run" -> "task_run"; functions -> "fn:name". */
export function objectKey(target: string): string {
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

/** Replays every migration (filename order) and returns the final privileges, RLS, policies, indexes. */
export function replay(migrations: Migration[]): State {
  const state: State = {
    privs: new Map(),
    policies: new Map(),
    rls: new Set(),
    indexes: new Set(),
  };
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
      const idx = stmt.match(/^create unique index (?:if not exists )?(\w+) on (?:public\.)?(\w+)/);
      if (idx) {
        state.indexes.add(`${idx[2]}:${idx[1]}`);
        continue;
      }
      const dropIdx = stmt.match(/^drop index (?:if exists )?(?:public\.)?(\w+)/);
      if (dropIdx) {
        for (const k of [...state.indexes])
          if (k.endsWith(`:${dropIdx[1]}`)) state.indexes.delete(k);
        continue;
      }
      // A policy's command is optional in SQL (Postgres defaults to ALL); capture it when present.
      const pol = stmt.match(/^create policy "([^"]+)" on (?:public\.)?(\w+)(?: for (\w+))?/);
      if (pol) {
        const [, name, tbl, command = 'all'] = pol;
        state.policies.set(`${tbl}:${command}:${name}`, {
          table: tbl,
          command,
          name,
          statement: stmt,
        });
        continue;
      }
      const dropPol = stmt.match(/^drop policy (?:if exists )?"([^"]+)" on (?:public\.)?(\w+)/);
      if (dropPol) {
        for (const k of [...state.policies.keys()])
          if (k.startsWith(`${dropPol[2]}:`) && k.endsWith(`:${dropPol[1]}`))
            state.policies.delete(k);
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

/** The grant a role holds on an object for a privilege, or undefined if none is recorded. */
export function grantHeld(
  state: State,
  object: string,
  role: string,
  priv: string,
): Grant | undefined {
  return state.privs.get(`${object}:${role}`)?.get(priv);
}

/** Every policy on a table, across commands (the Set-style consumers ask "is there any?"). */
export function policiesForTable(state: State, table: string): PolicyInfo[] {
  return [...state.policies.values()].filter((p) => p.table === table);
}

/** Read the repository's migration files (filename order is applied by replay). */
export function repoMigrations(dir = 'supabase/migrations'): Migration[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}
