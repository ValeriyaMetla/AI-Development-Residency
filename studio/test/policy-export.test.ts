import { describe, it, expect } from 'vitest';
import {
  serializePolicy,
  parsePolicyImport,
  POLICY_EXPORT_FORMAT,
} from '@/lib/domain/policy-export';
import type { PolicyRule } from '@/lib/data/policy';

/**
 * Policy portability (Epic 1). The two load-bearing properties the card asks for: a round-trip into
 * a fresh org is intact, and a malformed file is rejected cleanly (nothing written).
 */

function rule(p: Partial<PolicyRule> & { ruleText: string }): PolicyRule {
  return {
    id: p.id ?? 'id',
    policyId: 'p1',
    ruleText: p.ruleText,
    standardRuleId: p.standardRuleId ?? 'std-uuid',
    citation: p.citation ?? null,
    category: p.category ?? 'general',
    riskTier: p.riskTier ?? 'standard',
    origin: p.origin ?? 'custom',
    isBaselineSafety: p.isBaselineSafety ?? false,
    needsReview: false,
    sourceQuestion: p.sourceQuestion ?? null,
    suggestionKey: p.suggestionKey ?? null,
    createdAt: '2026-01-01',
  };
}

/** Minimal valid import JSON, overridable for the rejection cases. */
function importJson(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    formatVersion: POLICY_EXPORT_FORMAT,
    policy: { name: 'x' },
    rules: [{ ruleText: 'a', category: 'c', riskTier: 't', origin: 'custom' }],
    ...over,
  });
}

describe('serialize + parse round-trip', () => {
  const rules: PolicyRule[] = [
    rule({
      ruleText: 'Keep a human in the loop',
      origin: 'baseline',
      isBaselineSafety: true,
      category: 'human-oversight',
      citation: 'NIST AI RMF',
    }),
    rule({
      ruleText: 'Minimize personal data',
      origin: 'standard',
      category: 'data-protection',
      citation: 'ISO 42001',
    }),
    rule({ ruleText: 'Our own custom rule', origin: 'custom', category: 'custom' }),
  ];

  it('round-trips the rule set intact into a fresh org', () => {
    const fileText = JSON.stringify(serializePolicy({ name: 'Our policy' }, rules)); // what lands in the file
    const parsed = parsePolicyImport(fileText);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.name).toBe('Our policy');
    expect(parsed.rules.map((r) => r.ruleText)).toEqual([
      'Keep a human in the loop',
      'Minimize personal data',
      'Our own custom rule',
    ]);
    // Baseline flag + citation (provenance) survive the round-trip.
    const baseline = parsed.rules.find((r) => r.isBaselineSafety);
    expect(baseline?.ruleText).toBe('Keep a human in the loop');
    expect(baseline?.origin).toBe('baseline');
    expect(parsed.rules.find((r) => r.citation === 'ISO 42001')).toBeTruthy();
    // The internal FK is intentionally dropped in another org; the citation text carries provenance.
    expect(parsed.rules.every((r) => r.standardRuleId === null)).toBe(true);
  });

  it('stamps the format version on export', () => {
    expect(serializePolicy({ name: 'x' }, rules).formatVersion).toBe(POLICY_EXPORT_FORMAT);
  });

  it('exports no org id or internal row id (portable)', () => {
    const json = JSON.stringify(serializePolicy({ name: 'x' }, rules));
    expect(json).not.toContain('orgId');
    expect(json).not.toContain('policyId');
    expect(json).not.toContain('std-uuid');
  });
});

describe('parsePolicyImport rejects malformed input (nothing written)', () => {
  it('accepts a valid minimal import', () => {
    expect(parsePolicyImport(importJson()).ok).toBe(true);
  });

  it('rejects non-JSON text', () => {
    expect(parsePolicyImport('{not json').ok).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(parsePolicyImport('42').ok).toBe(false);
    expect(parsePolicyImport('null').ok).toBe(false);
  });

  it('rejects a wrong / missing format version', () => {
    expect(parsePolicyImport(importJson({ formatVersion: 999 })).ok).toBe(false);
    expect(parsePolicyImport(importJson({ formatVersion: undefined })).ok).toBe(false);
  });

  it('rejects a missing policy name', () => {
    expect(parsePolicyImport(importJson({ policy: {} })).ok).toBe(false);
  });

  it('rejects an empty or non-array rule list', () => {
    expect(parsePolicyImport(importJson({ rules: [] })).ok).toBe(false);
    expect(parsePolicyImport(importJson({ rules: 'nope' })).ok).toBe(false);
  });

  it('rejects a rule missing its text', () => {
    expect(
      parsePolicyImport(importJson({ rules: [{ category: 'c', riskTier: 't', origin: 'custom' }] }))
        .ok,
    ).toBe(false);
  });

  it('rejects a rule with an unknown origin', () => {
    expect(
      parsePolicyImport(
        importJson({ rules: [{ ruleText: 'a', category: 'c', riskTier: 't', origin: 'bogus' }] }),
      ).ok,
    ).toBe(false);
  });
});
