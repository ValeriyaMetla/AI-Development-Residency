import { describe, it, expect } from 'vitest';

// Smoke test: proves the Vitest harness runs in CI. Replace/expand with real
// domain and guardrail tests as those land (Build Plan Step 7, testing pyramid).
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
