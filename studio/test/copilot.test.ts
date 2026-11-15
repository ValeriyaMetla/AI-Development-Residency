import { describe, it, expect } from 'vitest';
import {
  resolveSignals,
  tierFromSignals,
  verdictFromTier,
  humanDecisionRequired,
  saferWay,
  reasonsFor,
  assess,
  type SignalInput,
  type Signals,
} from '@/lib/domain/copilot';

const NONE: Signals = {
  bannedPurpose: false,
  judgesPerson: false,
  highStakesDomain: false,
  sensitiveData: false,
  outputLeavesOrg: false,
};
const sig = (over: Partial<Signals>): Signals => ({ ...NONE, ...over });

describe('tierFromSignals — first-match decision table (design §3.5)', () => {
  it('no signals → minimal', () => {
    expect(tierFromSignals(NONE)).toBe('minimal');
  });
  it('banned purpose → prohibited (highest precedence)', () => {
    expect(tierFromSignals(sig({ bannedPurpose: true, outputLeavesOrg: true }))).toBe('prohibited');
  });
  it('judges a person → high', () => {
    expect(tierFromSignals(sig({ judgesPerson: true }))).toBe('high');
  });
  it('high-stakes domain → high', () => {
    expect(tierFromSignals(sig({ highStakesDomain: true }))).toBe('high');
  });
  it('sensitive data → high', () => {
    expect(tierFromSignals(sig({ sensitiveData: true }))).toBe('high');
  });
  it('only output-leaves-org → limited', () => {
    expect(tierFromSignals(sig({ outputLeavesOrg: true }))).toBe('limited');
  });
  it('prohibited beats a High-driver (order matters)', () => {
    expect(tierFromSignals(sig({ bannedPurpose: true, sensitiveData: true }))).toBe('prohibited');
  });
});

describe('verdictFromTier + humanDecisionRequired (design §5.3)', () => {
  it('maps every tier to a verdict', () => {
    expect(verdictFromTier('prohibited')).toBe('dont');
    expect(verdictFromTier('high')).toBe('use_with_conditions');
    expect(verdictFromTier('limited')).toBe('use_with_conditions');
    expect(verdictFromTier('minimal')).toBe('use');
    expect(verdictFromTier('undetermined')).toBe('out_of_scope');
  });
  it('requires a human decision only for high and prohibited', () => {
    expect(humanDecisionRequired('high')).toBe(true);
    expect(humanDecisionRequired('prohibited')).toBe(true);
    expect(humanDecisionRequired('limited')).toBe(false);
    expect(humanDecisionRequired('minimal')).toBe(false);
  });
});

describe('resolveSignals — unknown rounds UP (fail-safe, design §3.4)', () => {
  it('treats an unknown signal as true', () => {
    const input = { ...NONE, sensitiveData: 'unknown' } as unknown as SignalInput;
    expect(resolveSignals(input).sensitiveData).toBe(true);
    expect(tierFromSignals(resolveSignals(input))).toBe('high');
  });
});

describe('reasonsFor — one grounded reason per fired signal (design §5.2/§6)', () => {
  it('returns a reason with citation codes for each fired signal', () => {
    const reasons = reasonsFor(sig({ sensitiveData: true, outputLeavesOrg: true }));
    expect(reasons.map((r) => r.signalKey)).toEqual(['sensitiveData', 'outputLeavesOrg']);
    expect(reasons[0].citationCodes).toContain('iso42001-data-governance');
    expect(reasons.every((r) => r.citationCodes.length > 0)).toBe(true);
  });
  it('returns no reasons when nothing fired', () => {
    expect(reasonsFor(NONE)).toEqual([]);
  });
});

describe('saferWay — mitigations re-tier to a projected tier (design §4)', () => {
  it('is null for a minimal use (nothing to make safer)', () => {
    expect(saferWay(NONE)).toBeNull();
  });
  it('sensitive data → stripping neutralizes it, projecting a lower tier', () => {
    const s = saferWay(sig({ sensitiveData: true, outputLeavesOrg: true }));
    expect(s).not.toBeNull();
    // sensitiveData neutralized (strip) AND outputLeavesOrg neutralized (human review) → minimal.
    expect(s!.projectedTier).toBe('minimal');
    expect(s!.noSafePath).toBe(false);
    expect(s!.mitigations.map((m) => m.signalKey)).toContain('sensitiveData');
  });
  it('high-stakes domain does NOT neutralize — human approval stays a floor', () => {
    const s = saferWay(sig({ highStakesDomain: true }));
    expect(s!.projectedTier).toBe('high'); // still high; mitigation is a condition, not a cure
    expect(s!.mitigations[0].neutralizes).toBe(false);
  });
  it("banned purpose → no safe path (irreducible → don't)", () => {
    const s = saferWay(sig({ bannedPurpose: true }));
    expect(s!.noSafePath).toBe(true);
    expect(s!.projectedVerdict).toBe('dont');
  });
});

describe('assess — worked examples (design §3.5)', () => {
  it('donor thank-you (name only, external) → use_with_conditions / limited', () => {
    const r = assess({ ...NONE, outputLeavesOrg: true } as SignalInput);
    expect(r.tier).toBe('limited');
    expect(r.verdict).toBe('use_with_conditions');
    expect(r.humanDecisionRequired).toBe(false);
    expect(r.tierLabel).toMatch(/Limited/);
  });
  it('crisis responses → high, human decision required', () => {
    const r = assess({ ...NONE, highStakesDomain: true } as SignalInput);
    expect(r.tier).toBe('high');
    expect(r.verdict).toBe('use_with_conditions');
    expect(r.humanDecisionRequired).toBe(true);
  });
  it("rank applicants (banned social scoring + judges a person) → prohibited / don't", () => {
    const r = assess({ ...NONE, judgesPerson: true, bannedPurpose: true } as SignalInput);
    expect(r.tier).toBe('prohibited');
    expect(r.verdict).toBe('dont');
    expect(r.saferWay!.noSafePath).toBe(true);
  });
  it('low-stakes internal brainstorm → minimal / use, no safer-way', () => {
    const r = assess({ ...NONE } as SignalInput);
    expect(r.tier).toBe('minimal');
    expect(r.verdict).toBe('use');
    expect(r.saferWay).toBeNull();
  });
});
