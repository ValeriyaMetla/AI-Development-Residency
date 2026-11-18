import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CAPABILITY_MATRIX,
  SAFETY_STEP_IDS,
  capabilitiesForTier,
  resolveEntitlement,
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

describe('resolveEntitlement — capacity gate, never safety (ADR-0023 §4–7)', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  const past = new Date('2026-10-01T00:00:00Z');
  const future = new Date('2026-12-31T00:00:00Z');
  const cap = 10;

  it('free org within cap: may run, tier free', () => {
    const d = resolveEntitlement({ tier: 'free', premiumUntil: null, runsThisMonth: 3, cap, now });
    expect(d).toMatchObject({ effectiveTier: 'free', canRun: true, withinCap: true, reason: 'ok' });
  });

  it('free org at/over cap: blocked (before any output), reason cap_reached', () => {
    const atCap = resolveEntitlement({
      tier: 'free',
      premiumUntil: null,
      runsThisMonth: cap,
      cap,
      now,
    });
    const overCap = resolveEntitlement({
      tier: 'free',
      premiumUntil: null,
      runsThisMonth: cap + 5,
      cap,
      now,
    });
    expect(atCap).toMatchObject({ canRun: false, reason: 'cap_reached' });
    expect(overCap).toMatchObject({ canRun: false, reason: 'cap_reached' });
  });

  it('active premium: uncapped, may run even past the free cap', () => {
    const nullEnd = resolveEntitlement({
      tier: 'premium',
      premiumUntil: null,
      runsThisMonth: 9999,
      cap,
      now,
    });
    const futureEnd = resolveEntitlement({
      tier: 'premium',
      premiumUntil: future,
      runsThisMonth: 9999,
      cap,
      now,
    });
    expect(nullEnd).toMatchObject({ effectiveTier: 'premium', cap: null, canRun: true });
    expect(futureEnd).toMatchObject({ effectiveTier: 'premium', cap: null, canRun: true });
  });

  it('lapsed premium falls back to the free cap, safety intact (ADR-0023 §7)', () => {
    const withinFreeCap = resolveEntitlement({
      tier: 'premium',
      premiumUntil: past,
      runsThisMonth: 2,
      cap,
      now,
    });
    const overFreeCap = resolveEntitlement({
      tier: 'premium',
      premiumUntil: past,
      runsThisMonth: cap,
      cap,
      now,
    });
    expect(withinFreeCap).toMatchObject({ effectiveTier: 'free', canRun: true });
    expect(overFreeCap).toMatchObject({
      effectiveTier: 'free',
      canRun: false,
      reason: 'cap_reached',
    });
  });

  it('decides capacity ONLY — no input or output references a safety step (R1/R2)', () => {
    // The decision shape carries no safety toggle; canRun is purely a capacity verdict. Across every
    // plan state, the only reason a run is ever refused is 'cap_reached' — never a safety reason.
    for (const tier of ['free', 'premium'] as const) {
      for (const premiumUntil of [null, past, future]) {
        for (const runsThisMonth of [0, cap - 1, cap, cap + 100]) {
          const d = resolveEntitlement({ tier, premiumUntil, runsThisMonth, cap, now });
          expect(['ok', 'cap_reached']).toContain(d.reason);
          if (!d.canRun) expect(d.reason).toBe('cap_reached'); // the ONLY block reason is capacity
        }
      }
    }
  });
});

describe('safety is decoupled from entitlement (ADR-0023 §4; judge-arch)', () => {
  it('the governed-run pipeline and guardrails never read entitlement', () => {
    for (const path of ['lib/domain/pipeline.ts', 'lib/domain/guardrails.ts']) {
      const src = readFileSync(path, 'utf8').toLowerCase();
      expect(src).not.toContain('entitlement'); // no import, no reference
      expect(src).not.toContain('resolveentitlement');
      expect(src).not.toContain('free_monthly_run_cap');
      expect(src).not.toContain('canrun');
    }
  });
});
