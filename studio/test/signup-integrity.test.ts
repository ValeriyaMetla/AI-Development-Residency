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

// ADR-0034: sign-ups are limited by name-length CHECK constraints and one protected per-IP counter.
// This static check runs with no database (CI is credential-free, ADR-0016) and replays the
// migrations through the shared model in ./support/migration-replay (CONSERVATIVE, and strict about
// REVOKE ... FROM public). It asserts, after every migration:
//   (a) neither app role holds any privilege on signup_attempt, RLS is on, and no policy opens it
//       (otherwise a member could read or reset the per-IP counter);
//   (b) the counter function still makes its own checks and keeps the 5/hour limit, and never takes
//       the limit from the caller;
//   (c) UNLIKE the AI counter, claim_signup_attempt IS callable by anon — sign-up happens before
//       login — so the test asserts that grant stays, rather than flagging it; and
//   (d) both name-length constraints are still present.
// Live behavior is checked separately by supabase/checks/signup-rate-limit-check.sql.
// PenTest F-07 · SR-11 / SR-12.

const TABLE = 'signup_attempt';
const FN = 'claim_signup_attempt';

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
  for (const p of policiesForTable(state, TABLE))
    leaks.push(`unexpected ${TABLE} policy ${p.name}`);
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
