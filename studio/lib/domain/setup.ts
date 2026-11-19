/**
 * Self-serve setup progress (Domain layer, ADR-0003) — Epic 8, "Build self-serve setup (no
 * consultant)".
 *
 * Pure and I/O-free: the caller passes in facts it already read through `lib/data`, and this
 * module decides which setup steps are done, which one is next, and whether setup is complete.
 *
 * Why derived, not stored: every step's state already has one authoritative home in the database
 * (the org name from sign-up, the org's active policy, the org's governed runs). Working progress
 * out from those facts on each visit means there is no second "onboarding" record that could drift
 * out of sync with them — and it resumes on any device for free, because the facts are
 * server-side.
 */

export type SetupStepKey = 'organization' | 'rules' | 'first_run';

/** Facts read from the Data-Source layer. */
export type SetupFacts = {
  /** The org's name, set at sign-up (ADR-0007). Null/blank only if the read failed. */
  orgName: string | null;
  /** Whether the org has an active policy (ADR-0009: at most one). */
  hasActivePolicy: boolean;
  /** How many governed runs the org has started, all time. */
  runCount: number;
};

export type SetupStepState = { key: SetupStepKey; done: boolean };

export type SetupProgress = {
  /** Always in the recommended order: organization → rules → first run. */
  steps: SetupStepState[];
  doneCount: number;
  total: number;
  /** The first step not yet done, or null when every step is done. */
  nextStep: SetupStepKey | null;
  /** Setup is complete once the org has an active policy and at least one governed run. */
  isComplete: boolean;
};

export const SETUP_STEP_ORDER: readonly SetupStepKey[] = ['organization', 'rules', 'first_run'];

export function setupProgress(facts: SetupFacts): SetupProgress {
  const doneByKey: Record<SetupStepKey, boolean> = {
    organization: (facts.orgName ?? '').trim() !== '',
    rules: facts.hasActivePolicy,
    first_run: facts.runCount > 0,
  };

  const steps = SETUP_STEP_ORDER.map((key) => ({ key, done: doneByKey[key] }));
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done)?.key ?? null;

  return {
    steps,
    doneCount,
    total: steps.length,
    nextStep,
    // Completion is defined by the two steps that carry value — rules + a first governed run.
    // The organization step is confirmation only, so a failed org-name read never traps a leader
    // in setup after they have done the real work.
    isComplete: doneByKey.rules && doneByKey.first_run,
  };
}
