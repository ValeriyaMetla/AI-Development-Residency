import { describe, it, expect } from 'vitest';
import { reasonsFor, type Signals } from '@/lib/domain/copilot';
import {
  buildCitationMap,
  groundReasons,
  baselineCitations,
  BASELINE_RULE_CODES,
} from '@/lib/domain/copilot-grounding';

// A small stand-in for the seeded standards library (code -> citation).
const RULES = [
  {
    code: 'iso42001-data-governance',
    citation: 'ISO/IEC 42001:2023, Annex A (data governance controls)',
  },
  {
    code: 'euaiact-disclose-ai',
    citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 50 (transparency)',
  },
  { code: 'nist-human-oversight', citation: 'NIST AI RMF (2023), GOVERN function' },
  { code: 'nist-document-use', citation: 'NIST AI RMF (2023), MAP function' },
  { code: 'iso42001-managed-logging', citation: 'ISO/IEC 42001:2023 (AI management system)' },
  {
    code: 'iso42001-records',
    citation: 'ISO/IEC 42001:2023, Annex A (transparency and record-keeping)',
  },
];
const MAP = buildCitationMap(RULES);

const sig = (over: Partial<Signals>): Signals => ({
  bannedPurpose: false,
  judgesPerson: false,
  highStakesDomain: false,
  sensitiveData: false,
  outputLeavesOrg: false,
  ...over,
});

describe('buildCitationMap', () => {
  it('maps each rule code to its citation', () => {
    expect(MAP['iso42001-data-governance']).toMatch(/ISO\/IEC 42001/);
  });
});

describe('groundReasons — code-attached citations, no fabrication (§6)', () => {
  it("resolves each reason's codes to real standard citations", () => {
    const grounded = groundReasons(reasonsFor(sig({ sensitiveData: true })), MAP);
    expect(grounded).toHaveLength(1);
    expect(grounded[0].signalKey).toBe('sensitiveData');
    expect(grounded[0].citations).toEqual([
      {
        code: 'iso42001-data-governance',
        text: 'ISO/IEC 42001:2023, Annex A (data governance controls)',
        source: 'standard',
      },
    ]);
  });

  it('drops codes with no matching library rule (never invents a citation)', () => {
    const grounded = groundReasons(
      [{ signalKey: 'sensitiveData', plainText: 'x', citationCodes: ['does-not-exist'] }],
      MAP,
    );
    expect(grounded[0].citations).toEqual([]);
  });

  it('leaves no-signal input with no grounded reasons', () => {
    expect(groundReasons(reasonsFor(sig({})), MAP)).toEqual([]);
  });
});

describe('baselineCitations — the always-apply rules hold at every tier (§3.6)', () => {
  it('resolves the baseline codes that exist in the library', () => {
    const cites = baselineCitations(MAP);
    const codes = cites.map((c) => c.code);
    // euaiact-disclose-ai is in the map; all returned codes are baseline codes.
    expect(codes).toContain('euaiact-disclose-ai');
    expect(codes.every((c) => (BASELINE_RULE_CODES as readonly string[]).includes(c))).toBe(true);
    expect(cites.every((c) => c.text.length > 0)).toBe(true);
  });
});
