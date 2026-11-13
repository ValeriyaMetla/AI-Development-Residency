import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit-test runner for the testing pyramid's base (Build Plan Step 7).
// Node environment: domain/guardrail logic is pure functions (ADR-0003 / D5),
// so most tests need no DOM. A browser/jsdom environment can be added later
// for component tests. The '@' alias mirrors the tsconfig path so tests can
// import (and mock) '@/...' modules the same way the app does.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
