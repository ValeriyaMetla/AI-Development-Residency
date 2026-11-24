import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR-0029 point 8: the no-login demo stays isolated partly because the logged-out role (`anon`)
// has no way into the data. Anyone holding the public key can call the database directly
// (threat-model crossing C7, ADR-0028), so any opening for `anon` is an opening for the internet.
//
// CI has no database (ADR-0016), so this reads the migrations' text. It flags any statement that
// lets `anon` in:
//   - a GRANT (including ALTER DEFAULT PRIVILEGES … GRANT) to `anon` or PUBLIC (PUBLIC includes anon);
//   - a CREATE / ALTER POLICY for `anon` or PUBLIC;
//   - a CREATE POLICY with no TO clause, which Postgres applies to PUBLIC.
// REVOKE statements are always fine. What it can't see: Postgres's built-in default that lets
// everyone execute a new function (not a migration statement). Protected functions revoke that
// by hand, and Val's one-time read-only check covers the live database.

type Migration = { name: string; sql: string };

/** SQL statements, comments stripped, whitespace collapsed, lower-cased, quotes dropped. */
function statements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').replace(/"/g, '').trim().toLowerCase())
    .filter(Boolean);
}

/** True when a role list (e.g. "authenticated, anon") includes anon or PUBLIC. */
function opensToAnon(roleList: string): boolean {
  return roleList
    .split(',')
    .map((r) => r.trim())
    .some((r) => r === 'anon' || r === 'public');
}

// ADR-0034 addendum: sign-up runs before login and the app has no service-role key (ADR-0012/0028),
// so `anon` must hold EXECUTE on exactly one data-free function, claim_signup_attempt(text). It reads
// no data and writes only an IP hash to a locked table (signup_attempt), so it is not the "opening
// into the data" ADR-0029 §8 guards against. This ONE statement is allowed by exact, normalised
// match; every other anon opening — including any other grant to this same function — still fails.
const ALLOWED_ANON = [
  'grant execute on function public.claim_signup_attempt(text) to anon, authenticated',
];

/** Every migration statement that would give the logged-out role a way in. */
export function anonOpenings(migrations: Migration[]): string[] {
  const found: string[] = [];
  for (const { name, sql } of migrations) {
    for (const stmt of statements(sql)) {
      const grant = stmt.match(
        /^(?:alter default privileges .*? )?grant .+? to (.+?)(?: with grant option| granted by \w+)?$/,
      );
      if (grant && opensToAnon(grant[1])) {
        if (ALLOWED_ANON.includes(stmt)) continue; // sanctioned, data-free exception (ADR-0034)
        found.push(`${name}: ${stmt.slice(0, 120)}`);
        continue;
      }

      const policy = stmt.match(/^(create|alter) policy /);
      if (!policy) continue;
      const to = stmt.match(/ to (\w+(?:\s*,\s*\w+)*)(?= using | with check |$)/);
      const missingTo = policy[1] === 'create' && !to;
      if (missingTo || (to && opensToAnon(to[1]))) found.push(`${name}: ${stmt.slice(0, 120)}`);
    }
  }
  return found;
}

function repoMigrations(): Migration[] {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

const bad = (sql: string): Migration => ({ name: '29990101000000_bad.sql', sql });

describe('the logged-out role gets no way in (ADR-0029 §8)', () => {
  it('reads the real migrations', () => {
    expect(repoMigrations().length).toBeGreaterThan(0);
  });

  it('no migration grants anon access or adds an RLS rule that lets it in', () => {
    expect(anonOpenings(repoMigrations())).toEqual([]);
  });

  // Mutation checks: prove each kind of opening is caught (testing-code-review rule 4).
  it.each([
    ['a table grant to anon', 'grant select on public.policy to anon;'],
    ['a grant to PUBLIC', 'grant execute on function public.current_org_id() to public;'],
    ['a grant listing anon among roles', 'grant select on public.org to authenticated, anon;'],
    [
      'a default-privileges grant to anon',
      'alter default privileges in schema public grant select on tables to anon;',
    ],
    [
      'an RLS rule for anon',
      'create policy "demo_read" on public.policy for select to anon using (true);',
    ],
    [
      'an RLS rule for PUBLIC',
      'create policy "p" on public.org for select to public using (true);',
    ],
    ['an RLS rule with no TO clause', 'create policy "p" on public.org for select using (true);'],
    ['a policy altered to anon', 'alter policy "p" on public.org to anon;'],
    // The allow-list is exact: a DIFFERENT grant to the sanctioned function is still an opening.
    [
      'any other grant to the sign-up gate (anon only)',
      'grant execute on function public.claim_signup_attempt(text) to anon;',
    ],
  ])('fails on %s', (_label, sql) => {
    expect(anonOpenings([...repoMigrations(), bad(sql)])).toHaveLength(1);
  });

  it.each([
    ['a revoke from anon', 'revoke all on public.ai_request from authenticated, anon;'],
    [
      'a revoke from PUBLIC',
      'revoke all on function public.claim_ai_request(text) from public, anon;',
    ],
    [
      'a grant to authenticated',
      'grant execute on function public.review_task_run(uuid) to authenticated;',
    ],
    [
      'an RLS rule for authenticated',
      'create policy "p" on public.org for select to authenticated using (id = public.current_org_id());',
    ],
    // The one sanctioned, data-free exception (ADR-0034 addendum).
    [
      'the sanctioned sign-up gate grant',
      'grant execute on function public.claim_signup_attempt(text) to anon, authenticated;',
    ],
  ])('allows %s', (_label, sql) => {
    expect(anonOpenings([bad(sql)])).toEqual([]);
  });
});
