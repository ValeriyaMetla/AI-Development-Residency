/**
 * Free-vs-premium tier matrix (Domain layer, ADR-0023). ONE source of truth for what is free
 * forever and what is premium, plus the cost-payer attribute and the placeholder free cap. Pure
 * config + types: no I/O, no framework, no plan/usage resolution — the Service-layer entitlement
 * gate (Phase 1, "Keep free safety active behind the paywall") reads this; the Domain safety code
 * (pipeline.ts / guardrails.ts) never does. The dependency points downward only (nothing imported
 * here), so the Leak Test holds.
 *
 * The invariants this module encodes (asserted in entitlements.test.ts, and the backbone of the
 * Phase 1 never-disable regression test):
 *   - every capability is assigned a tier (nothing unlabelled);
 *   - no `safety` or `oversight` capability is ever premium;
 *   - the ONLY premium capabilities are `capacity`.
 * That is ADR-0023 §1–3 made checkable: caps and the paywall touch capacity alone, never a safety
 * or oversight capability.
 */

/** The two tiers. Free is forever and needs no payment (ADR-0023 §1–2). */
export type TierName = 'free' | 'premium';

/**
 * What a capability *is*, which decides whether it may ever be priced:
 *   - `safety`    — a baseline-safety step; free forever, never gateable (ADR-0023 §1, §4).
 *   - `oversight` — a see/improve/prove tool (dashboard, living policy, export); free (ADR-0023 §2).
 *   - `capacity`  — how *much* you can do; the only kind that may be premium (ADR-0023 §3).
 */
export type CapabilityKind = 'safety' | 'oversight' | 'capacity';

export type Capability = {
  /** Stable identifier (used by the gate and tests; not user-facing). */
  readonly id: string;
  /** Plain-language name for the reviewed matrix / account screen. */
  readonly label: string;
  readonly kind: CapabilityKind;
  readonly tier: TierName;
};

/**
 * The named, reviewed free-vs-premium matrix (ADR-0023; tier card AC #4). Capacity is split: the
 * generous baseline is free, only volume/Skills/seats *beyond* it are premium. Safety and oversight
 * are free in full.
 */
export const CAPABILITY_MATRIX: readonly Capability[] = [
  // — Baseline safety net: free forever, never gateable (ADR-0023 §1) —
  { id: 'policy_grounding', label: 'Policy grounding on every run', kind: 'safety', tier: 'free' },
  { id: 'self_critique', label: 'Self-critique (Challenger) pass', kind: 'safety', tier: 'free' },
  { id: 'rule_check', label: 'Deterministic rule-check / guardrails', kind: 'safety', tier: 'free' },
  { id: 'pii_handling', label: 'PII detection + strip/minimize (confirm-to-keep)', kind: 'safety', tier: 'free' },
  { id: 'human_approval_gate', label: 'Human-approval gate on flagged runs', kind: 'safety', tier: 'free' },
  { id: 'provenance_label', label: 'Provenance label on output', kind: 'safety', tier: 'free' },
  { id: 'audit_logging', label: 'Per-run audit logging', kind: 'safety', tier: 'free' },

  // — Oversight & growth tools: free, so any org can see/improve/prove its AI use (ADR-0023 §2) —
  { id: 'usage_dashboard', label: 'Usage dashboard (Epic 2)', kind: 'oversight', tier: 'free' },
  { id: 'living_policy', label: 'Living-policy suggestions / editable rules (Epic 1)', kind: 'oversight', tier: 'free' },
  { id: 'audit_export', label: 'Responsible-AI / audit export (Epic 7)', kind: 'oversight', tier: 'free' },

  // — Capacity: the generous baseline is free; only what is BEYOND it is premium (ADR-0023 §3) —
  { id: 'monthly_runs_within_cap', label: 'Governed runs within the generous monthly cap', kind: 'capacity', tier: 'free' },
  { id: 'monthly_runs_beyond_cap', label: 'Run volume beyond the free monthly cap', kind: 'capacity', tier: 'premium' },
  { id: 'starter_skills', label: 'Starter Skill set', kind: 'capacity', tier: 'free' },
  { id: 'additional_skills', label: 'Additional Skills beyond the starter set', kind: 'capacity', tier: 'premium' },
  { id: 'included_seats', label: 'Included staff seats', kind: 'capacity', tier: 'free' },
  { id: 'additional_seats', label: 'Additional staff seats', kind: 'capacity', tier: 'premium' },
] as const;

/** Capability ids by kind — handy for the gate and the Phase 1 regression test. */
export const SAFETY_STEP_IDS: readonly string[] = CAPABILITY_MATRIX.filter(
  (c) => c.kind === 'safety',
).map((c) => c.id);

/** The capabilities a given tier includes (a free org gets every free-tier capability). */
export function capabilitiesForTier(tier: TierName): readonly Capability[] {
  // Premium is additive over free: a premium org gets free capabilities plus the premium ones.
  return tier === 'premium' ? CAPABILITY_MATRIX : CAPABILITY_MATRIX.filter((c) => c.tier === 'free');
}

/**
 * Who pays Anthropic for the model calls on a run (ADR-0023 §6). Modeled now, with ONE value this
 * release, so "bring your own Claude" (an org paying via its own API key) is an additive future
 * value — `'org_byok'` — not a migration rewrite. Not built this release.
 */
export type CostPayer = 'platform'; // Future (reserved, ADR-0023 §6): | 'org_byok'

/** The only cost-payer in effect this release. */
export const DEFAULT_COST_PAYER: CostPayer = 'platform';

/**
 * Placeholder free monthly run cap — GENEROUS and NOT the final figure (ADR-0023 §8). The real
 * number needs per-run Claude API cost data and is set when billing is turned on (out of scope this
 * release). The cap degrades capacity ONLY: a capped-out run is blocked before output, never run
 * unsafely (enforced in Phase 1). Tune here; nothing else should hardcode a cap.
 */
export const FREE_MONTHLY_RUN_CAP = 500;

// ============================================================================
// Entitlement resolution (ADR-0023 §4–7) — pure, the Service gate's decision core.
//
// CRITICAL INVARIANT: this function decides CAPACITY only (may a run START?). It takes no safety
// input and has no output that could turn a safety step off — safety is decoupled from entitlement
// (ADR-0023 §4; tested in entitlements.test.ts). A denied decision blocks the run BEFORE output; a
// run that is allowed goes through the unchanged pipeline, so its safety is identical on every plan.
// ============================================================================

export type EntitlementInput = {
  readonly tier: TierName;
  /** When premium ends; null = no end / not applicable. A past value means lapsed (ADR-0023 §7). */
  readonly premiumUntil: Date | null;
  /** Governed runs the org has already made this calendar month. */
  readonly runsThisMonth: number;
  /** Override the free cap (tests); defaults to FREE_MONTHLY_RUN_CAP. */
  readonly cap?: number;
  /** Override "now" (tests); defaults to the current instant. */
  readonly now?: Date;
};

export type EntitlementDecision = {
  /** The tier actually in force: lapsed/expired premium resolves to 'free'. */
  readonly effectiveTier: TierName;
  readonly runsThisMonth: number;
  /** The run cap in force, or null when uncapped (premium). */
  readonly cap: number | null;
  readonly withinCap: boolean;
  /**
   * Whether a run may START. Reflects CAPACITY ONLY — never safety. `false` means block before any
   * output (capacity/cap), never "run without safety".
   */
  readonly canRun: boolean;
  readonly reason: 'ok' | 'cap_reached';
};

/**
 * Resolve an org's effective tier and whether its next run may start, from plan + usage.
 * Premium is uncapped (capacity is what premium buys); free is metered by the soft cap. Lapsed or
 * expired premium is treated as free. Default-deny on tier (unknown/absent premium → free) is the
 * caller's job (ADR-0023 §5); this takes an explicit tier.
 */
export function resolveEntitlement(input: EntitlementInput): EntitlementDecision {
  const now = input.now ?? new Date();
  const cap = input.cap ?? FREE_MONTHLY_RUN_CAP;
  const premiumActive =
    input.tier === 'premium' && (input.premiumUntil === null || input.premiumUntil > now);

  if (premiumActive) {
    return {
      effectiveTier: 'premium',
      runsThisMonth: input.runsThisMonth,
      cap: null,
      withinCap: true,
      canRun: true,
      reason: 'ok',
    };
  }

  const withinCap = input.runsThisMonth < cap;
  return {
    effectiveTier: 'free',
    runsThisMonth: input.runsThisMonth,
    cap,
    withinCap,
    canRun: withinCap,
    reason: withinCap ? 'ok' : 'cap_reached',
  };
}
