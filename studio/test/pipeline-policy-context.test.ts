import { describe, it, expect } from 'vitest';
import { withPolicyContext } from '@/lib/domain/policy-context';

describe('withPolicyContext (policy inheritance)', () => {
  it('returns the base prompt unchanged when there is no active policy', () => {
    expect(withPolicyContext('Base prompt.', [])).toBe('Base prompt.');
  });

  it('appends the policy rules to the prompt when a policy is active', () => {
    const result = withPolicyContext('Base prompt.', [
      { ruleText: 'A named person is accountable for AI use.' },
      { ruleText: 'We check AI output before acting on it.' },
    ]);
    expect(result).toContain('Base prompt.');
    expect(result).toContain("Follow your organization's AI policy:");
    expect(result).toContain('- A named person is accountable for AI use.');
    expect(result).toContain('- We check AI output before acting on it.');
  });
});
