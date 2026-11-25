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

// ADR-0030 point 8: every AI request is counted only through claim_ai_request, and app users can
// never read, add, change or delete the counter rows directly (otherwise a member could reset their
// own limit). After every migration: (a) neither app role holds any privilege on ai_request, (b)
// row-level security is on and no policy opens it, (c) logged-out users can't call the function,
// and (d) the function still repeats its own checks and keeps every limit, including the platform
// ceiling. PenTest F-02 · SR-02 / SR-03.
//
// CI has no database (ADR-0016), so this replays the migrations through the shared model in
// ./support/migration-replay (CONSERVATIVE, and strict about REVOKE ... FROM public). Live behavior
// is checked separately by supabase/checks/rate-limit-check.sql.

const TABLE = 'ai_request';
const FN = 'claim_ai_request';

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
  for (const p of policiesForTable(state, TABLE))
    leaks.push(`unexpected ${TABLE} policy ${p.name}`);
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
