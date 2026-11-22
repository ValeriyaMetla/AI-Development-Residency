import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0028 point 6: a review decision is made once, only through review_task_run. App users must
// end up unable to (a) update any task_run column except status/updated_at, (b) insert into
// approval directly, or (c) call review_task_run while logged out; the one-decision-per-run rule
// and the narrowed task_run update policy must survive every later migration. PenTest F-01, F-21.
//
// CI has no database (ADR-0016), so — like audit-append-only.test.ts — this replays the migrations
// in filename order. It is CONSERVATIVE: a new table starts with every privilege granted to both app
// roles, and a new function starts with EXECUTE granted to PUBLIC (Postgres' default), so the test
// only passes when each one was explicitly revoked. Postgres rules modelled: a table-level REVOKE
// also removes that privilege's column grants; a column-level REVOKE leaves a table-level grant in
// place. Live behavior is checked separately by supabase/checks/review-integrity-check.sql.

const APP_ROLES = ['authenticated', 'anon'] as const;
const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;
const PIPELINE_COLUMNS = ['status', 'updated_at'];

type Migration = { name: string; sql: string };
type Grant = { table: boolean; columns: Set<string> };
type State = {
  privs: Map<string, Map<string, Grant>>; // "object:role" -> privilege -> grant
  policies: Map<string, string>; // "table:command:name" -> full policy statement
  indexes: Set<string>;
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

function roles(list: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  return names.includes('public') ? [...APP_ROLES] : names.filter((r) => r !== 'public');
}

/** "public.task_run" / "table task_run" -> "task_run"; functions -> "fn:name". */
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

/** Replays every migration and returns the final privileges, policies and indexes. */
export function replay(migrations: Migration[]): State {
  const state: State = { privs: new Map(), policies: new Map(), indexes: new Set() };
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
      const pol = stmt.match(/^create policy "([^"]+)" on (?:public\.)?(\w+) for (\w+)/);
      if (pol) {
        state.policies.set(`${pol[2]}:${pol[3]}:${pol[1]}`, stmt);
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

/** Every way the replayed state breaks ADR-0028. Empty = safe. */
export function reviewLeaks(state: State): string[] {
  const leaks: string[] = [];
  const held = (object: string, role: string, priv: string) =>
    state.privs.get(`${object}:${role}`)?.get(priv);

  for (const role of APP_ROLES) {
    const upd = held('task_run', role, 'update');
    if (upd?.table) leaks.push(`${role} can update every task_run column`);
    for (const col of upd?.columns ?? [])
      if (role === 'anon' || !PIPELINE_COLUMNS.includes(col))
        leaks.push(`${role} can update task_run.${col}`);

    const ins = held('approval', role, 'insert');
    if (ins?.table || (ins?.columns.size ?? 0) > 0) leaks.push(`${role} can insert into approval`);
  }
  if (held('fn:review_task_run', 'anon', 'execute')?.table)
    leaks.push('anon can call review_task_run');

  if (!state.indexes.has('approval:approval_one_per_run'))
    leaks.push('approval has no one-decision-per-run rule');

  const updatePolicies = [...state.policies.entries()].filter(([k]) =>
    k.startsWith('task_run:update:'),
  );
  for (const [key, stmt] of updatePolicies) {
    const name = key.split(':')[2];
    if (name !== 'task_run_update_own_running')
      leaks.push(`unexpected task_run update policy ${name}`);
    else {
      const [using, check = ''] = stmt.split(' with check ');
      if (!using.includes("status = 'running'") || !using.includes('run_by = (select auth.uid())'))
        leaks.push('task_run update policy no longer limited to your own running run');
      if (/'approved'|'rejected'/.test(check))
        leaks.push('task_run update policy lets a member set a review decision');
    }
  }
  if (updatePolicies.length === 0)
    leaks.push('task_run update policy missing (pipeline would break)');
  return leaks;
}

function repoMigrations(): Migration[] {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

const later = (sql: string): Migration => ({ name: '29990101000000_bad.sql', sql });

describe('a review decision is made once, only through review_task_run (ADR-0028)', () => {
  it('after all migrations, nothing reopens the F-01 / F-21 paths', () => {
    expect(reviewLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('the protected function repeats its own checks (security definer, pinned path, needs_review, lock)', () => {
    const all = repoMigrations()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => m.sql)
      .join('\n');
    const start = all.lastIndexOf('create or replace function public.review_task_run');
    expect(start).toBeGreaterThan(-1);
    const body = all.slice(start, all.indexOf('$$;', all.indexOf('as $$', start)));
    expect(body).toContain('security definer');
    expect(body).toContain("set search_path = ''");
    expect(body).toContain('public.current_org_id()');
    expect(body).toContain("v_status <> 'needs_review'");
    expect(body).toContain('for update');
  });

  // Mutation checks: prove the replay actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration re-grants UPDATE on all of task_run', () => {
    expect(
      reviewLeaks(
        replay([...repoMigrations(), later('grant update on public.task_run to authenticated;')]),
      ),
    ).toContain('authenticated can update every task_run column');
  });

  it('fails if a later migration lets members update another task_run column', () => {
    expect(
      reviewLeaks(
        replay([
          ...repoMigrations(),
          later('grant update (run_by) on public.task_run to authenticated;'),
        ]),
      ),
    ).toContain('authenticated can update task_run.run_by');
  });

  it('fails if a later migration gives back direct inserts into approval', () => {
    expect(
      reviewLeaks(
        replay([
          ...repoMigrations(),
          later(
            'grant insert (task_run_id, decided_by, decision, note) on public.approval to authenticated;',
          ),
        ]),
      ),
    ).toContain('authenticated can insert into approval');
  });

  it('fails if a later migration drops the one-decision-per-run rule', () => {
    expect(
      reviewLeaks(
        replay([...repoMigrations(), later('drop index if exists public.approval_one_per_run;')]),
      ),
    ).toContain('approval has no one-decision-per-run rule');
  });

  it('fails if a later migration brings back an org-wide task_run update policy', () => {
    const bad = later(
      'create policy "task_run_update_org" on public.task_run for update to authenticated ' +
        'using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());',
    );
    expect(reviewLeaks(replay([...repoMigrations(), bad]))).toContain(
      'unexpected task_run update policy task_run_update_org',
    );
  });

  it('fails if the update policy is widened to allow a review decision', () => {
    const bad = later(
      'drop policy if exists "task_run_update_own_running" on public.task_run; ' +
        'create policy "task_run_update_own_running" on public.task_run for update to authenticated ' +
        "using (org_id = public.current_org_id() and run_by = (select auth.uid()) and status = 'running') " +
        "with check (org_id = public.current_org_id() and status in ('completed', 'approved'));",
    );
    expect(reviewLeaks(replay([...repoMigrations(), bad]))).toContain(
      'task_run update policy lets a member set a review decision',
    );
  });

  it('fails if a later migration lets logged-out users call the review function', () => {
    const bad = later(
      'grant execute on function public.review_task_run(uuid, public.approval_decision, text, text) to anon;',
    );
    expect(reviewLeaks(replay([...repoMigrations(), bad]))).toContain(
      'anon can call review_task_run',
    );
  });

  it('assumes a function is callable by everyone unless a migration revokes it', () => {
    const onlyCreate = [
      {
        name: '1.sql',
        sql: 'create or replace function public.review_task_run() returns text as $$ select 1; $$;',
      },
    ];
    expect(reviewLeaks(replay(onlyCreate))).toContain('anon can call review_task_run');
  });
});
