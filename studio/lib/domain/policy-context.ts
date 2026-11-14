/**
 * Policy-grounded context (Domain layer, ADR-0003 / Epic 1 inheritance). Pure + I/O-free:
 * folds the org's active policy rules into a Skill's system prompt so every governed run is
 * guided by the current rules. Kept separate from the pipeline so it is unit-testable without
 * pulling in the Claude SDK or data layer.
 */

/** Append the active policy's rules to a Skill's base prompt. Empty policy -> unchanged. */
export function withPolicyContext(basePrompt: string, rules: { ruleText: string }[]): string {
  if (rules.length === 0) return basePrompt;
  const lines = rules.map((r) => `- ${r.ruleText}`).join('\n');
  return `${basePrompt}\n\nFollow your organization's AI policy:\n${lines}`;
}
