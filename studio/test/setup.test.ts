import { describe, it, expect } from 'vitest';
import { setupProgress, shouldRouteToSetup, type SetupFacts } from '@/lib/domain/setup';

const fresh: SetupFacts = { orgName: 'Riverside Food Bank', hasActivePolicy: false, runCount: 0 };

describe('setupProgress (self-serve setup, Epic 8)', () => {
  it('a brand-new org: organization done, rules next, not complete', () => {
    const p = setupProgress(fresh);
    expect(p.steps).toEqual([
      { key: 'organization', done: true },
      { key: 'rules', done: false },
      { key: 'first_run', done: false },
    ]);
    expect(p.doneCount).toBe(1);
    expect(p.total).toBe(3);
    expect(p.nextStep).toBe('rules');
    expect(p.isComplete).toBe(false);
  });

  it('after activating a policy: first run is next', () => {
    const p = setupProgress({ ...fresh, hasActivePolicy: true });
    expect(p.nextStep).toBe('first_run');
    expect(p.doneCount).toBe(2);
    expect(p.isComplete).toBe(false);
  });

  it('active policy + one run: complete, no next step', () => {
    const p = setupProgress({ ...fresh, hasActivePolicy: true, runCount: 1 });
    expect(p.isComplete).toBe(true);
    expect(p.nextStep).toBeNull();
    expect(p.doneCount).toBe(3);
  });

  it('a run without a policy (allowed on baseline safety, ADR-0018) is not complete', () => {
    const p = setupProgress({ ...fresh, runCount: 4 });
    expect(p.steps.find((s) => s.key === 'first_run')?.done).toBe(true);
    expect(p.nextStep).toBe('rules');
    expect(p.isComplete).toBe(false);
  });

  it('a blank or missing org name leaves the organization step open', () => {
    expect(setupProgress({ ...fresh, orgName: '   ' }).nextStep).toBe('organization');
    expect(setupProgress({ ...fresh, orgName: null }).nextStep).toBe('organization');
  });

  it('a failed org-name read never blocks completion once the real work is done', () => {
    const p = setupProgress({ orgName: null, hasActivePolicy: true, runCount: 2 });
    expect(p.isComplete).toBe(true);
  });
});

describe('shouldRouteToSetup (Home → /setup redirect)', () => {
  const incomplete = setupProgress(fresh);
  const complete = setupProgress({ ...fresh, hasActivePolicy: true, runCount: 1 });
  const leader = 'accountable_leader' as const;

  it('routes a leader with unfinished setup', () => {
    expect(
      shouldRouteToSetup({ role: leader, progress: incomplete, skippedThisSession: false }),
    ).toBe(true);
  });

  it('does not route once setup is complete (no repeat)', () => {
    expect(
      shouldRouteToSetup({ role: leader, progress: complete, skippedThisSession: false }),
    ).toBe(false);
  });

  it('does not route after "Skip for now" in this session (no loop)', () => {
    expect(
      shouldRouteToSetup({ role: leader, progress: incomplete, skippedThisSession: true }),
    ).toBe(false);
  });

  it('never routes a Doer or an unknown role', () => {
    for (const role of ['frontline_doer', null, undefined] as const) {
      expect(shouldRouteToSetup({ role, progress: incomplete, skippedThisSession: false })).toBe(
        false,
      );
    }
  });

  it('a failed progress read never traps the leader in setup', () => {
    expect(shouldRouteToSetup({ role: leader, progress: null, skippedThisSession: false })).toBe(
      false,
    );
  });
});
