/**
 * Tests for arch-gate.mjs's `demo-is-offline` rule (ADR-0029 point 8). They prove the rule FAILS
 * a demo file with any runtime path to data, auth or a model, and PASSES type-only imports.
 * Zero dependencies: Node's built-in test runner. Run: `node --test scripts/arch-gate.test.mjs`.
 * Each case writes one demo file into a throwaway folder and scans it with the REAL config, so a
 * change to `arch-gate.config.json` is tested too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from './arch-gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(readFileSync(join(here, '..', 'arch-gate.config.json'), 'utf8'));
const RULE = 'demo-is-offline';

/** Scans one file at `path` (relative to a throwaway root) and returns the demo rule's hits. */
function demoViolations(path, source) {
  const root = mkdtempSync(join(tmpdir(), 'arch-gate-'));
  try {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), source);
    return scan([path], CONFIG, root).filter((v) => v.rule === RULE);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const LIB = 'studio/lib/demo/sample-org.ts';
const PAGE = 'studio/app/demo/page.tsx';

test('fails a runtime import from the data layer', () => {
  const hits = demoViolations(LIB, "import { getPolicy } from '@/lib/data/policy';\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, 'lib/data');
});

test('fails a relative import into lib/data from lib/demo', () => {
  const hits = demoViolations(LIB, "import { getPolicy } from '../data/policy';\n");
  assert.deepEqual(
    hits.map((h) => h.pattern),
    ["'../data"],
  );
});

test('fails a Supabase import and client call in a demo page', () => {
  const source = [
    "import { createClient } from '@supabase/supabase-js';",
    'const db = createClient(url, key);',
  ].join('\n');
  const patterns = demoViolations(PAGE, source).map((h) => h.pattern);
  assert.ok(patterns.includes('@supabase/'));
  assert.ok(patterns.includes('createClient('));
});

test('fails a Claude SDK import', () => {
  const hits = demoViolations(LIB, "import Anthropic from '@anthropic-ai/sdk';\n");
  assert.equal(hits.length, 1);
});

test('passes a one-line type-only import from the data layer', () => {
  assert.deepEqual(demoViolations(LIB, "import type { Policy } from '@/lib/data/policy';\n"), []);
});

test('passes a multi-line type-only import, through its closing from line', () => {
  const source = [
    'import type {',
    '  Policy,',
    '  PolicyRule,',
    "} from '@/lib/data/policy';",
    '',
    'export const name = "Sample";',
  ].join('\n');
  assert.deepEqual(demoViolations(LIB, source), []);
});

test('still fails a runtime import that follows a type-only import', () => {
  const source = [
    "import type { Policy } from '@/lib/data/policy';",
    "import { getPolicy } from '@/lib/data/policy';",
  ].join('\n');
  const hits = demoViolations(LIB, source);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
});

test('fails the mixed form `import { type X }`, which is not skipped', () => {
  const hits = demoViolations(LIB, "import { type Policy } from '@/lib/data/policy';\n");
  assert.equal(hits.length, 1);
});

test('passes a clean demo file that uses only pure Domain code', () => {
  const source = [
    "import { detectPii, redactPii } from '@/lib/domain/pii';",
    "import { ruleCheck } from '@/lib/domain/guardrails';",
  ].join('\n');
  assert.deepEqual(demoViolations(LIB, source), []);
});

test("fails a runtime data import in the landing page's Try-it section", () => {
  const hits = demoViolations(
    'studio/app/components/landing/try-demo.tsx',
    "import { getPolicy } from '@/lib/data/policy';\n",
  );
  assert.equal(hits.length, 1);
});

test('does not apply to files outside the demo folders', () => {
  const hits = demoViolations(
    'studio/lib/domain/example.ts',
    "import { getPolicy } from '@/lib/data/policy';\n",
  );
  assert.deepEqual(hits, []);
});
