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

describe('resume-after-interruption (Epic 8, "Add resume-after-interruption")', () => {
  // Resume is delivered by /setup's derived progress (see docs/reference/onboarding-resume.md):
  // because progress is computed from server-owned facts, the leader returns to the next
  // incomplete step with no browser state. These assert the card's ACs against that mechanism.
  const leader = 'accountable_leader' as const;

  it('AC1 — resumes at the next incomplete step, not the beginning', () => {
    // Org confirmed + policy active, no run yet → resume lands on "first_run", not step 1.
    expect(setupProgress({ ...fresh, hasActivePolicy: true }).nextStep).toBe('first_run');
  });

  it('AC3 — cross-device: the same server facts resume identically on any device', () => {
    // Progress is a pure function of server-owned facts (no browser/session state), so a return
    // on a different device computes the same next step.
    const facts: SetupFacts = { ...fresh, hasActivePolicy: true };
    expect(setupProgress(facts)).toEqual(setupProgress(facts));
    expect(setupProgress(facts).nextStep).toBe('first_run');
  });

  it('AC4 — a completed leader is never re-prompted to resume', () => {
    const complete = setupProgress({ ...fresh, hasActivePolicy: true, runCount: 1 });
    expect(
      shouldRouteToSetup({ role: leader, progress: complete, skippedThisSession: false }),
    ).toBe(false);
  });

  it('AC5 — what is done and what remains is visible on resume', () => {
    const p = setupProgress({ ...fresh, hasActivePolicy: true });
    expect(p.doneCount).toBe(2);
    expect(p.total).toBe(3);
    expect(p.steps.filter((s) => !s.done).map((s) => s.key)).toEqual(['first_run']);
  });
});
