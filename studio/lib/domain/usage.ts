/**
 * Pure presentation-state logic for the Registry view (Chunk 3, Domain layer, ADR-0003).
 *
 * No I/O, no framework — unit-testable in isolation. Maps the result of a read (a run count, or
 * `null` when the read failed) to the single state the Usage view should render, so that
 * "no activity yet" and "we couldn't load it" never collapse into the same branch.
 */

export type UsageViewState = 'error' | 'empty' | 'active';

/**
 * @param runCount the org's run count, or `null` if the read failed.
 * A negative/invalid count is treated as empty, never as activity.
 */
export function usageViewState(runCount: number | null): UsageViewState {
  if (runCount === null) return 'error';
  if (runCount <= 0) return 'empty';
  return 'active';
}
