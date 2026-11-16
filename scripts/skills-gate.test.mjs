/**
 * Tests for skills-gate.mjs — proves the gate PASSES valid Skills and FAILS known breakage.
 * Zero dependencies: Node's built-in test runner. Run: `node --test scripts/skills-gate.test.mjs`.
 * Each case runs the real CLI against a permanent fixture repo under fixtures/skills-gate/ and
 * asserts the exit status plus the stable error code (not the human sentence).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const GATE = join(here, 'skills-gate.mjs');
const FIXTURES = join(here, 'fixtures', 'skills-gate');

function run(mode, fixture) {
  try {
    const stdout = execFileSync('node', [GATE, mode, '--root', join(FIXTURES, fixture)], {
      encoding: 'utf8',
    });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

test('valid fixture passes structure and sync', () => {
  const r = run('all', 'valid');
  assert.equal(r.code, 0, r.out);
});

test('missing-version fails with REQUIRED_FIELD_MISSING', () => {
  const r = run('structure', 'missing-version');
  assert.equal(r.code, 1);
  assert.match(r.out, /REQUIRED_FIELD_MISSING/);
});

test('name/folder mismatch fails with NAME_FOLDER_MISMATCH', () => {
  const r = run('structure', 'name-folder-mismatch');
  assert.equal(r.code, 1);
  assert.match(r.out, /NAME_FOLDER_MISMATCH/);
});

test('angle bracket in frontmatter fails with FRONTMATTER_CHARACTER_FORBIDDEN', () => {
  const r = run('structure', 'forbidden-frontmatter');
  assert.equal(r.code, 1);
  assert.match(r.out, /FRONTMATTER_CHARACTER_FORBIDDEN/);
});

test('directory with no SKILL.md fails with SKILL_FILE_MISSING', () => {
  const r = run('structure', 'missing-skill-file');
  assert.equal(r.code, 1);
  assert.match(r.out, /SKILL_FILE_MISSING/);
});

test('real skill absent from the index fails with LIBRARY_BUILT_ENTRY_MISSING', () => {
  const r = run('sync', 'sync-unindexed');
  assert.equal(r.code, 1);
  assert.match(r.out, /LIBRARY_BUILT_ENTRY_MISSING/);
});

test('built index entry with no real skill fails with LIBRARY_ENTRY_STALE', () => {
  const r = run('sync', 'sync-stale');
  assert.equal(r.code, 1);
  assert.match(r.out, /LIBRARY_ENTRY_STALE/);
});

test('a planned (⬜) entry does not require a real file — sync passes', () => {
  const r = run('sync', 'sync-planned-ok');
  assert.equal(r.code, 0, r.out);
});

test('bad mode exits 2 (usage error)', () => {
  const r = run('nonsense', 'valid');
  assert.equal(r.code, 2);
});
