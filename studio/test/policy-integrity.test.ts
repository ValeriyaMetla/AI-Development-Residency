import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0031 point 6: only an Accountable Leader changes an organization's policy, and activation is
// one protected all-or-nothing step. After every migration: (a) neither app role can UPDATE
// `policy` and no update rule exists, so activate_policy / discard_draft_policies are the only way
// to change a status (F-03, F-18); (b) inserts into policy, policy_rule and policy_seed_response are
// leader-only, and rules can only be added to a draft, so nobody appends to the live policy; (c)
// logged-out users can't call the functions; (d) activate_policy still makes every check itself.
//
// CI has no database (ADR-0016), so — like review-integrity.test.ts and rate-limit-integrity.test.ts,
// whose replay this copies (a shared helper is the next planned PR) — this replays the migrations in
// filename order. It is CONSERVATIVE: a new table starts with every privilege granted to both app
// roles, and a new function starts with EXECUTE granted to both (Supabase's default privileges, as we
// understand them), so the test only passes when each was explicitly revoked. REVOKE ... FROM public
// does not remove a role's own grant. Live behavior is checked by
// supabase/checks/policy-integrity-check.sql.

const APP_ROLES = ['authenticated', 'anon'] as const;
const TABLE_PRIVS = ['select', 'insert', 'update', 'delete', 'truncate'] as const;
const FUNCTIONS = ['activate_policy', 'discard_draft_policies', 'current_user_is_leader'];

/** The insert rules ADR-0031 expects, and what each must still require. */
const INSERT_RULES: Record<string, { name: string; mustInclude: string[] }> = {
  policy: {
    name: 'policy_insert_leader',
    mustInclude: ['public.current_user_is_leader()', 'public.current_org_id()'],
  },
  policy_rule: {
    name: 'policy_rule_insert_leader_draft',
    mustInclude: ['public.current_user_is_leader()', 'public.current_org_id()', "status = 'draft'"],
  },
  policy_seed_response: {
    name: 'policy_seed_response_insert_leader',
    mustInclude: [
      'public.current_user_is_leader()',
      'public.current_org_id()',
      'created_by = (select auth.uid())',
    ],
  },
};

type Migration = { name: string; sql: string };
type Grant = { table: boolean; columns: Set<string> };
type State = {
  privs: Map<string, Map<string, Grant>>; // "object:role" -> privilege -> grant
  policies: Map<string, string>; // "table:command:name" -> full policy statement
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

/** GRANT ... TO public reaches every app role; REVOKE ... FROM public removes no role's own grant. */
function roles(list: string, verb: string): string[] {
  const names = list.split(',').map((r) => r.trim());
  const named = names.filter((r) => r !== 'public');
  return verb === 'grant' && names.includes('public') ? [...APP_ROLES] : named;
}

/** "public.policy" / "table policy" -> "policy"; functions -> "fn:name". */
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

/** Replays every migration and returns the final privileges and row-level-security rules. */
export function replay(migrations: Migration[]): State {
  const state: State = { privs: new Map(), policies: new Map() };
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

/** Every way the replayed state lets a non-leader change the policy. Empty = safe. */
export function policyLeaks(state: State): string[] {
  const leaks: string[] = [];
  for (const role of APP_ROLES) {
    const upd = state.privs.get(`policy:${role}`)?.get('update');
    if (upd?.table || (upd?.columns.size ?? 0) > 0) leaks.push(`${role} can update policy`);
  }
  for (const key of state.policies.keys())
    if (key.startsWith('policy:update:') || key.startsWith('policy:all:'))
      leaks.push(`unexpected policy rule ${key.split(':')[2]} lets members change policies`);

  for (const [table, expected] of Object.entries(INSERT_RULES)) {
    const inserts = [...state.policies.entries()].filter(
      ([k]) => k.startsWith(`${table}:insert:`) || k.startsWith(`${table}:all:`),
    );
    for (const [key, stmt] of inserts) {
      const name = key.split(':')[2];
      if (name !== expected.name) {
        leaks.push(`unexpected ${table} insert rule ${name}`);
        continue;
      }
      if (!stmt.includes('to authenticated'))
        leaks.push(`${table} insert rule not limited to authenticated`);
      for (const needle of expected.mustInclude)
        if (!stmt.includes(needle)) leaks.push(`${table} insert rule no longer checks ${needle}`);
    }
    if (!inserts.some(([k]) => k.split(':')[2] === expected.name))
      leaks.push(`${table} insert rule ${expected.name} missing`);
  }

  for (const fn of FUNCTIONS)
    if (state.privs.get(`fn:${fn}:anon`)?.get('execute')?.table) leaks.push(`anon can call ${fn}`);
  return leaks;
}

function bodyOf(allSql: string, fn: string): string | null {
  const sql = allSql.toLowerCase();
  const start = sql.lastIndexOf(`create or replace function public.${fn}`);
  if (start === -1) return null;
  return sql.slice(start, sql.indexOf('$$;', sql.indexOf('as $$', start)));
}

/** The latest definition of each function must still make its own checks. Empty = safe. */
export function functionLeaks(allSql: string): string[] {
  const leaks: string[] = [];
  const must: Record<string, [string, string][]> = {
    activate_policy: [
      ['security definer', 'does not run as security definer'],
      ["set search_path = ''", 'does not pin search_path'],
      ['auth.uid()', 'does not check who is signed in'],
      ['public.current_user_is_leader()', 'does not check the caller is a leader'],
      ['public.current_org_id()', 'does not take the org from current_org_id()'],
      ['for update', 'does not lock the target policy'],
      ['pg_advisory_xact_lock', 'does not lock the org'],
      ["<> 'draft'", 'does not require a draft'],
      ['public.policy_rule', 'does not require the policy to have rules'],
    ],
    discard_draft_policies: [
      ['security definer', 'does not run as security definer'],
      ["set search_path = ''", 'does not pin search_path'],
      ['public.current_user_is_leader()', 'does not check the caller is a leader'],
      ['public.current_org_id()', 'does not take the org from current_org_id()'],
      ["status = 'draft'", 'does not limit itself to drafts'],
    ],
    current_user_is_leader: [
      ['security definer', 'does not run as security definer'],
      ["set search_path = ''", 'does not pin search_path'],
      ['auth.uid()', 'does not check the caller'],
      ["'accountable_leader'", 'does not check the leader role'],
    ],
  };
  for (const [fn, checks] of Object.entries(must)) {
    const body = bodyOf(allSql, fn);
    if (body === null) {
      leaks.push(`${fn} is missing`);
      continue;
    }
    for (const [needle, message] of checks)
      if (!body.includes(needle)) leaks.push(`${fn} ${message}`);
  }
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

describe('only a leader changes the policy, through one protected step (ADR-0031)', () => {
  it('after all migrations, nothing reopens the F-03 / F-18 paths or the rule-insert gap', () => {
    expect(policyLeaks(replay(repoMigrations()))).toEqual([]);
  });

  it('the protected functions repeat their own checks', () => {
    expect(functionLeaks(joined(repoMigrations()))).toEqual([]);
  });

  // Mutation checks: prove the test actually catches a regression (testing-code-review rule 4).
  it('fails if a later migration gives members UPDATE on policy again', () => {
    expect(
      policyLeaks(
        replay([...repoMigrations(), later('grant update on public.policy to authenticated;')]),
      ),
    ).toContain('authenticated can update policy');
  });

  it('fails if a later migration brings back an org-wide update rule', () => {
    const bad = later(
      'create policy "policy_update_org" on public.policy for update to authenticated ' +
        'using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());',
    );
    expect(policyLeaks(replay([...repoMigrations(), bad]))).toContain(
      'unexpected policy rule policy_update_org lets members change policies',
    );
  });

  it('fails if the rule-insert check stops requiring a draft', () => {
    const bad = later(
      'drop policy if exists "policy_rule_insert_leader_draft" on public.policy_rule; ' +
        'create policy "policy_rule_insert_leader_draft" on public.policy_rule for insert to authenticated ' +
        'with check (public.current_user_is_leader() and exists (select 1 from public.policy p ' +
        'where p.id = policy_rule.policy_id and p.org_id = public.current_org_id()));',
    );
    expect(policyLeaks(replay([...repoMigrations(), bad]))).toContain(
      "policy_rule insert rule no longer checks status = 'draft'",
    );
  });

  it('fails if a second, looser insert rule is added beside the leader one', () => {
    const bad = later(
      'create policy "policy_rule_insert_org" on public.policy_rule for insert to authenticated ' +
        'with check (true);',
    );
    expect(policyLeaks(replay([...repoMigrations(), bad]))).toContain(
      'unexpected policy_rule insert rule policy_rule_insert_org',
    );
  });

  it('fails if the policy insert rule drops the leader check', () => {
    const bad = later(
      'drop policy if exists "policy_insert_leader" on public.policy; ' +
        'create policy "policy_insert_leader" on public.policy for insert to authenticated ' +
        'with check (org_id = public.current_org_id());',
    );
    expect(policyLeaks(replay([...repoMigrations(), bad]))).toContain(
      'policy insert rule no longer checks public.current_user_is_leader()',
    );
  });

  it('fails if a later migration lets logged-out users call activate_policy', () => {
    expect(
      policyLeaks(
        replay([
          ...repoMigrations(),
          later('grant execute on function public.activate_policy(uuid) to anon;'),
        ]),
      ),
    ).toContain('anon can call activate_policy');
  });

  it('fails if a function is revoked only from public, not from anon by name', () => {
    const fnOnly = [
      ...repoMigrations(),
      later(
        "create or replace function public.discard_draft_policies() returns text as $$ select 'ok'; $$; " +
          'revoke all on function public.discard_draft_policies() from public;',
      ),
    ];
    expect(policyLeaks(replay(fnOnly))).toContain('anon can call discard_draft_policies');
  });

  it('fails if a later redefinition of activate_policy drops the leader check', () => {
    const weakened =
      'create or replace function public.activate_policy(p_policy_id uuid) returns text ' +
      "language plpgsql security definer set search_path = '' as $$ begin return 'ok'; end; $$;";
    expect(functionLeaks(joined(repoMigrations()) + '\n' + weakened)).toContain(
      'activate_policy does not check the caller is a leader',
    );
  });
});
