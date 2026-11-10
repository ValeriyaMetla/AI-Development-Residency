import { defineConfig } from 'vitest/config';

// Unit-test runner for the testing pyramid's base (Build Plan Step 7).
// Node environment: domain/guardrail logic is pure functions (ADR-0003 / D5),
// so most tests need no DOM. A browser/jsdom environment can be added later
// for component tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
