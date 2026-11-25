import { describe, expect, it } from 'vitest';
import { grantHeld, policiesForTable, replay, type Migration } from './migration-replay';

// Unit tests for the shared migration-replay model (ADR-0035 / F-17). These pin the Postgres rules
// the model encodes, using small inline migrations rather than the repo files, so the model itself is
// trusted before the permission tests rely on it. The strict REVOKE ... FROM public cases are also the
// break-it guard: loosen `roles()` back to treating a revoke-from-public as reaching every app role and
// those cases go red.

const m = (sql: string): Migration[] => [{ name: '0001_test.sql', sql }];

describe('migration-replay: conservative defaults', () => {
  it('a new table starts fully granted to both app roles', () => {
    const s = replay(m('create table t (id int);'));
    for (const role of ['anon', 'authenticated']) {
      expect(grantHeld(s, 't', role, 'select')?.table).toBe(true);
      expect(grantHeld(s, 't', role, 'update')?.table).toBe(true);
      expect(grantHeld(s, 't', role, 'delete')?.table).toBe(true);
    }
  });

  it('a new function starts with EXECUTE granted to both app roles', () => {
    const s = replay(m('create function claim() returns void language sql as $$ select 1 $$;'));
    expect(grantHeld(s, 'fn:claim', 'anon', 'execute')?.table).toBe(true);
    expect(grantHeld(s, 'fn:claim', 'authenticated', 'execute')?.table).toBe(true);
  });
});

describe('migration-replay: REVOKE ... FROM public is strict (the ADR-0035 case)', () => {
  it('revoking a function from public alone leaves each role its own EXECUTE', () => {
    const s = replay(
      m(
        'create function claim() returns void language sql as $$ select 1 $$;' +
          'revoke execute on function claim() from public;',
      ),
    );
    // The bug ADR-0035 warns about: a loose model would clear anon here. It must NOT.
    expect(grantHeld(s, 'fn:claim', 'anon', 'execute')?.table).toBe(true);
    expect(grantHeld(s, 'fn:claim', 'authenticated', 'execute')?.table).toBe(true);
  });

  it('only naming each role removes the function grant', () => {
    const s = replay(
      m(
        'create function claim() returns void language sql as $$ select 1 $$;' +
          'revoke execute on function claim() from anon, authenticated;',
      ),
    );
    expect(grantHeld(s, 'fn:claim', 'anon', 'execute')?.table).toBe(false);
    expect(grantHeld(s, 'fn:claim', 'authenticated', 'execute')?.table).toBe(false);
  });

  it('GRANT ... TO public reaches every app role', () => {
    const s = replay(
      m(
        'create table t (id int);' +
          'revoke all on table t from anon, authenticated;' +
          'grant select on table t to public;',
      ),
    );
    expect(grantHeld(s, 't', 'anon', 'select')?.table).toBe(true);
    expect(grantHeld(s, 't', 'authenticated', 'select')?.table).toBe(true);
  });
});

describe('migration-replay: table vs column REVOKE', () => {
  it("a table-level REVOKE also clears that privilege's column grants", () => {
    const s = replay(
      m(
        'create table t (id int, status text);' +
          'revoke all on table t from anon, authenticated;' +
          'grant update (status) on table t to authenticated;' +
          'revoke update on table t from authenticated;',
      ),
    );
    const g = grantHeld(s, 't', 'authenticated', 'update');
    expect(g?.table).toBe(false);
    expect(g?.columns.size).toBe(0);
  });

  it('a column-level REVOKE leaves a table-level grant in place', () => {
    const s = replay(
      m(
        'create table t (id int, status text);' +
          'revoke all on table t from anon, authenticated;' +
          'grant update on table t to authenticated;' +
          'revoke update (status) on table t from authenticated;',
      ),
    );
    expect(grantHeld(s, 't', 'authenticated', 'update')?.table).toBe(true);
  });

  it('REVOKE ALL expands to every table privilege', () => {
    const s = replay(m('create table t (id int);revoke all on table t from anon, authenticated;'));
    for (const priv of ['select', 'insert', 'update', 'delete', 'truncate']) {
      expect(grantHeld(s, 't', 'anon', priv)?.table).toBe(false);
      expect(grantHeld(s, 't', 'authenticated', priv)?.table).toBe(false);
    }
  });
});

describe('migration-replay: RLS, policies and indexes', () => {
  it('tracks RLS enable then disable', () => {
    const on = replay(m('create table t (id int);alter table t enable row level security;'));
    expect(on.rls.has('t')).toBe(true);
    const off = replay(
      m(
        'create table t (id int);alter table t enable row level security;' +
          'alter table t disable row level security;',
      ),
    );
    expect(off.rls.has('t')).toBe(false);
  });

  it('keys policies by table:command:name, defaulting a missing command to all', () => {
    const s = replay(
      m(
        'create table t (id int);' +
          'create policy "p1" on t for update to authenticated using (true);' +
          'create policy "p2" on public.t to authenticated using (true);',
      ),
    );
    expect(s.policies.has('t:update:p1')).toBe(true);
    expect(s.policies.has('t:all:p2')).toBe(true);
    expect(policiesForTable(s, 't')).toHaveLength(2);
  });

  it('drops a policy across commands', () => {
    const s = replay(
      m(
        'create table t (id int);' +
          'create policy "p1" on t for update to authenticated using (true);' +
          'drop policy "p1" on t;',
      ),
    );
    expect(policiesForTable(s, 't')).toHaveLength(0);
  });

  it('tracks a unique index then its drop', () => {
    const on = replay(m('create table t (id int);create unique index t_idx on t (id);'));
    expect(on.indexes.has('t:t_idx')).toBe(true);
    const off = replay(
      m('create table t (id int);create unique index t_idx on t (id);drop index t_idx;'),
    );
    expect(off.indexes.has('t:t_idx')).toBe(false);
  });
});
