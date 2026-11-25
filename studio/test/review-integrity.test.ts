import { describe, expect, it } from 'vitest';
import {
  APP_ROLES,
  replay,
  repoMigrations,
  type Migration,
  type State,
} from './support/migration-replay';

// ADR-0028 point 6: a review decision is made once, only through review_task_run. App users must
// end up unable to (a) update any task_run column except status/updated_at, (b) insert into
// approval directly, or (c) call review_task_run while logged out; the one-decision-per-run rule
// and the narrowed task_run update policy must survive every later migration. PenTest F-01, F-21.
//
// CI has no database (ADR-0016), so this replays the migrations through the shared model in
// ./support/migration-replay — CONSERVATIVE (a new table/function starts fully open) and strict about
// REVOKE ... FROM public (it leaves each role's own grant). Live behavior is checked separately by
// supabase/checks/review-integrity-check.sql.

const PIPELINE_COLUMNS = ['status', 'updated_at'];

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

  const updatePolicies = [...state.policies.values()].filter(
    (p) => p.table === 'task_run' && p.command === 'update',
  );
  for (const p of updatePolicies) {
    if (p.name !== 'task_run_update_own_running')
      leaks.push(`unexpected task_run update policy ${p.name}`);
    else {
      const [using, check = ''] = p.statement.split(' with check ');
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
