import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ADR-0036: a Co-Pilot "don't" assessment can never be approved, enforced in the one protected
// review step (review_task_run, ADR-0028). CI has no database (ADR-0016), so this reads the
// migration's SQL; live behavior is checked by supabase/checks/copilot-not-approvable-check.sql.

const DIR = 'supabase/migrations';
const OLD = readFileSync(`${DIR}/20261121120000_review_task_run.sql`, 'utf8');
const NEW = readFileSync(`${DIR}/20261123120000_review_refuses_dont_approval.sql`, 'utf8');

/** The function body from `create or replace function public.review_task_run(` to its `$$;`. */
function functionOf(sql: string): string {
  const start = sql.indexOf('create or replace function public.review_task_run(');
  expect(start, 'function definition present').toBeGreaterThanOrEqual(0);
  const end = sql.indexOf('$$;', start);
  return sql.slice(start, end + 3);
}

const ADDED_CHECK = /\n  -- ADR-0036:[\s\S]*?return 'not_approvable';\n  end if;\n/;

describe('review_task_run refuses to approve a Co-Pilot "don\'t" assessment', () => {
  const fn = functionOf(NEW);

  it('keeps the same signature and stays a locked-down protected function', () => {
    expect(fn).toContain(
      'create or replace function public.review_task_run(\n  p_task_run_id uuid,\n  p_decision public.approval_decision,\n  p_note text default null,\n  p_edited_output text default null\n)',
    );
    expect(fn).toContain('security definer');
    expect(fn).toContain("set search_path = ''");
    expect(NEW).toMatch(
      /revoke all on function public\.review_task_run\(uuid, public\.approval_decision, text, text\)\s+from public, anon;/,
    );
    expect(NEW).toMatch(
      /grant execute on function public\.review_task_run\(uuid, public\.approval_decision, text, text\)\s+to authenticated;/,
    );
  });

  it('refuses only approvals, for any "dont" or "prohibited" assessment on the run', () => {
    const check = fn.match(ADDED_CHECK)?.[0] ?? '';
    expect(check).toContain("p_decision = 'approved'");
    expect(check).toContain('from public.copilot_assessment ca');
    expect(check).toContain('ca.task_run_id = p_task_run_id');
    expect(check).toContain("ca.verdict = 'dont' or ca.tier = 'prohibited'");
  });

  it('checks before writing anything (after "is it still waiting", before the approval insert)', () => {
    const at = (s: string) => fn.indexOf(s);
    expect(at("return 'not_pending'")).toBeLessThan(at("return 'not_approvable'"));
    expect(at("return 'not_approvable'")).toBeLessThan(at('insert into public.task_output'));
    expect(at("return 'not_approvable'")).toBeLessThan(at('insert into public.approval'));
  });

  it('changes nothing else in the function (old body + the one added check)', () => {
    const withoutCheck = fn.replace(ADDED_CHECK, '');
    expect(withoutCheck).toBe(functionOf(OLD));
  });

  it('stays in force: the newest migration that redefines review_task_run keeps the refusal', () => {
    // If a later migration rewrites the function, it must carry this check forward.
    const latest = readdirSync(DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .filter((f) =>
        readFileSync(`${DIR}/${f}`, 'utf8').includes(
          'create or replace function public.review_task_run(',
        ),
      )
      .at(-1)!;
    expect(functionOf(readFileSync(`${DIR}/${latest}`, 'utf8'))).toMatch(ADDED_CHECK);
  });
});
