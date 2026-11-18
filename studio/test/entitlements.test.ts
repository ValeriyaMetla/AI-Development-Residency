import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_MATRIX,
  SAFETY_STEP_IDS,
  capabilitiesForTier,
  DEFAULT_COST_PAYER,
  FREE_MONTHLY_RUN_CAP,
} from '@/lib/domain/entitlements';

describe('free-vs-premium tier matrix (ADR-0023)', () => {
  it('assigns every capability a tier — nothing unlabelled (AC #4)', () => {
    for (const c of CAPABILITY_MATRIX) {
      expect(['free', 'premium']).toContain(c.tier);
    }
  });

  it('never puts a safety or oversight capability behind premium (ADR-0023 §1–2)', () => {
    const gated = CAPABILITY_MATRIX.filter(
      (c) => (c.kind === 'safety' || c.kind === 'oversight') && c.tier === 'premium',
    );
    expect(gated).toEqual([]);
  });

  it('allows ONLY capacity capabilities to be premium (ADR-0023 §3, AC #4)', () => {
    const premium = CAPABILITY_MATRIX.filter((c) => c.tier === 'premium');
    expect(premium.length).toBeGreaterThan(0); // premium is non-empty (capacity exists)
    for (const c of premium) expect(c.kind).toBe('capacity');
  });

  it('keeps the whole baseline safety net free for every org (ADR-0023 §1)', () => {
    const safety = CAPABILITY_MATRIX.filter((c) => c.kind === 'safety');
    expect(safety.length).toBeGreaterThan(0);
    for (const c of safety) expect(c.tier).toBe('free');
    // The ids the Phase 1 regression test will assert run on every plan state.
    expect(SAFETY_STEP_IDS).toEqual(safety.map((c) => c.id));
  });

  it('uses unique capability ids', () => {
    const ids = CAPABILITY_MATRIX.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives a free org every free capability and no premium one', () => {
    const free = capabilitiesForTier('free');
    expect(free.every((c) => c.tier === 'free')).toBe(true);
    expect(free.some((c) => c.kind === 'safety')).toBe(true);
    expect(free.some((c) => c.kind === 'oversight')).toBe(true);
  });

  it('makes premium additive over free (premium org gets free + premium)', () => {
    expect(capabilitiesForTier('premium')).toEqual(CAPABILITY_MATRIX);
  });

  it('defaults the cost-payer to platform-pays this release (ADR-0023 §6)', () => {
    expect(DEFAULT_COST_PAYER).toBe('platform');
  });

  it('ships a generous positive placeholder free cap (ADR-0023 §8)', () => {
    expect(FREE_MONTHLY_RUN_CAP).toBeGreaterThan(0);
  });
});
