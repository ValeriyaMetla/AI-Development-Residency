import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0039: audit writes go through one protected step, write_audit_event. App users must end up
// with NO direct insert on audit_event, and only `authenticated` (never `anon`/public) may call the
// function — whatever later migrations do. PenTest F-14 / SR-15.
//
// CI has no database (ADR-0016), so — like audit-append-only.test.ts and review-integrity.test.ts —
// this replays the migrations' GRANT/REVOKE in filename order. It is CONSERVATIVE: a new table starts
// with every privilege granted to both app roles, and a new function starts with EXECUTE granted to
// PUBLIC (Postgres' default), so the test only passes when each one was explicitly revoked. Postgres
// rules modelled: a table-level REVOKE also removes that privilege's column grants; a column-level
// REVOKE leaves a table-level grant in place. Live behavior is checked separately by
// supabase/checks/audit-write-path-check.sql.

const APP_ROLES = ['authenticated', 'anon'] as const;
const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;

type Migration = { name: string; sql: string };
type Grant = { table: boolean; columns: Set<string> };
type State = { privs: Map<string, Map<string, Grant>> }; // "object:role" -> privilege -> grant

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

function roles(list: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  return names.includes('public') ? [...APP_ROLES] : names.filter((r) => r !== 'public');
}

/** "public.audit_event" / "table audit_event" -> "audit_event"; functions -> "fn:name". */
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

/** Replays every migration and returns the final privileges. */
export function replay(migrations: Migration[]): State {
  const state: State = { privs: new Map() };
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
      const g = stmt.match(
        /^(grant|revoke) (.+?) on (.+?) (to|from) ([a-z_, ]+?)(?: with grant option| cascade)?$/,
      );
      if (!g) continue;
      const [, verb, privList, target, , roleList] = g;
      const object = objectKey(target);
      for (const role of roles(roleList)) {
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

/** Every way the replayed state breaks ADR-0039. Empty = safe. */
export function auditWriteLeaks(state: State): string[] {
  const leaks: string[] = [];
  const held = (object: string, role: string, priv: string) =>
    state.privs.get(`${object}:${role}`)?.get(priv);

  // 1. No app role may insert into audit_event directly (table- or column-level).
  for (const role of APP_ROLES) {
    const ins = held('audit_event', role, 'insert');
    if (ins?.table || (ins?.columns.size ?? 0) > 0)
      leaks.push(`${role} can insert into audit_event`);
  }

  // 2. The writer is callable by signed-in users only — never anon/public.
  if (held('fn:write_audit_event', 'anon', 'execute')?.table)
    leaks.push('anon can call write_audit_event');
  if (!held('fn:write_audit_event', 'authenticated', 'execute')?.table)
    leaks.push('authenticated cannot call write_audit_event');

  return leaks;
}

function repoMigrations(): Migration[] {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

const later = (sql: string): Migration => ({ name: '29990101000000_bad.sql', sql });

describe('audit writes go through one protected step (ADR-0039)', () => {
  it('after all migrations, no app role can insert into audit_event and only authenticated can call the writer', () => {
    expect(auditWriteLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('the writer repeats its own checks (security definer, pinned path, refuses review-only kinds, needs a backing record)', () => {
    const all = repoMigrations()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => m.sql)
      .join('\n');
    const start = all.lastIndexOf('create or replace function public.write_audit_event');
    expect(start).toBeGreaterThan(-1);
    const body = all.slice(start, all.indexOf('$$;', all.indexOf('as $$', start)));
    expect(body).toContain('security definer');
    expect(body).toContain("set search_path = ''");
    expect(body).toContain('public.current_org_id()');
    expect(body).toContain('(select auth.uid())');
    // Review-only kinds are refused here (written only by review_task_run, ADR-0028).
    expect(body).toContain('forbidden_kind');
    expect(body).toMatch(/task_approved.*task_rejected|task_rejected.*task_approved/);
    // Outcome kinds need a backing record in the sibling tables.
    expect(body).toContain('no_backing');
    expect(body).toContain('public.guardrail_check');
    expect(body).toContain('public.copilot_assessment');
    expect(body).toContain('public.run_correction');
  });

  // Mutation checks: prove the replay actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration gives back direct insert on audit_event', () => {
    expect(
      auditWriteLeaks(
        replay([
          ...repoMigrations(),
          later(
            'grant insert (org_id, task_run_id, actor, event_type, payload) on public.audit_event to authenticated;',
          ),
        ]),
      ),
    ).toContain('authenticated can insert into audit_event');
  });

  it('fails if a later migration lets logged-out users call the writer', () => {
    expect(
      auditWriteLeaks(
        replay([
          ...repoMigrations(),
          later('grant execute on function public.write_audit_event(uuid, text, jsonb) to anon;'),
        ]),
      ),
    ).toContain('anon can call write_audit_event');
  });

  it('fails if a later migration re-grants ALL (incl. insert) on audit_event', () => {
    expect(
      auditWriteLeaks(
        replay([...repoMigrations(), later('grant all on public.audit_event to anon;')]),
      ),
    ).toContain('anon can insert into audit_event');
  });

  it('assumes a function is callable by everyone unless a migration revokes it', () => {
    const onlyCreate = [
      {
        name: '1.sql',
        sql: 'create or replace function public.write_audit_event() returns text as $$ select 1; $$;',
      },
    ];
    expect(auditWriteLeaks(replay(onlyCreate))).toContain('anon can call write_audit_event');
  });
});
