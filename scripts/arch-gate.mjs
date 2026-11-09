#!/usr/bin/env node
/**
 * arch-gate.mjs — deterministic architecture quality gate (zero dependencies).
 *
 * The back-end half of the "quality sandwich" (ADR-0002): it mechanically enforces
 * the judge-arch architecture rules at the file level, so a violation can't reach
 * `main` even if the generation-time skill review is skipped. It scans files for the
 * banned patterns declared in `arch-gate.config.json`, honours pre-existing debt listed
 * in `arch-gate.waivers.json`, and exits non-zero on any new violation (CI blocks the PR).
 *
 * Rules target the decided ADR-0003 layer structure (studio/app = Presentation,
 * studio/lib/data = Data-Source, studio/lib/domain = Domain). Until Phase-0 code lands
 * there is nothing to flag, so the gate passes green — it is armed and waiting.
 *
 * Usage:
 *   node scripts/arch-gate.mjs --changed [--base <ref>]  # files changed vs base (default origin/main)
 *   node scripts/arch-gate.mjs --all                     # every file under the repo
 *   node scripts/arch-gate.mjs --baseline                # print a waivers file for current violations
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CONFIG = join(ROOT, 'arch-gate.config.json');
const WAIVERS = join(ROOT, 'arch-gate.waivers.json');
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage']);

function readJSON(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`arch-gate: required file not found: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`arch-gate: cannot parse ${path}: ${err.message}`);
  }
}

function toPosix(p) {
  return p.split('\\').join('/');
}

// Translate a glob (supports **, *, ?, {a,b}) into a RegExp over POSIX-style paths.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      const opts = glob
        .slice(i + 1, end)
        .split(',')
        .map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
      re += '(' + opts.join('|') + ')';
      i = end;
    } else if ('.+^$()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function matchesAny(file, globs) {
  return globs.some((g) => globToRegExp(g).test(file));
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(toPosix(relative(ROOT, full)));
  }
  return out;
}

function changedFiles(base) {
  const run = (args) => {
    try {
      return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    } catch {
      return null;
    }
  };
  let out = run(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]);
  if (out == null) out = run(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']);
  if (out == null) return [];
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toPosix);
}

function scan(files, config) {
  const violations = [];
  const rules = config.rules || {};
  for (const [ruleName, rule] of Object.entries(rules)) {
    const targets = rule.targetFiles || [];
    const excludes = rule.exclude || [];
    const patterns = rule.bannedPatterns || [];
    for (const file of files) {
      if (!matchesAny(file, targets)) continue;
      if (excludes.length && matchesAny(file, excludes)) continue;
      let content;
      try {
        content = readFileSync(join(ROOT, file), 'utf8');
      } catch {
        continue;
      }
      content.split('\n').forEach((text, idx) => {
        for (const pat of patterns) {
          if (text.includes(pat)) {
            violations.push({
              rule: ruleName,
              file,
              line: idx + 1,
              pattern: pat,
              text: text.trim().slice(0, 120),
            });
          }
        }
      });
    }
  }
  return violations;
}

function waiverKey(v) {
  return `${v.rule}::${v.file}::${v.pattern}`;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--all') ? 'all' : args.includes('--baseline') ? 'baseline' : 'changed';
  const baseIdx = args.indexOf('--base');
  const base = baseIdx >= 0 && args[baseIdx + 1] ? args[baseIdx + 1] : 'origin/main';

  const config = readJSON(CONFIG);
  const files = mode === 'changed' ? changedFiles(base) : walk(ROOT);
  const violations = scan(files, config);

  if (mode === 'baseline') {
    const waivers = violations.map(({ rule, file, pattern }) => ({ rule, file, pattern }));
    console.log(JSON.stringify({ version: '1.0', waivers }, null, 2));
    process.exit(0);
  }

  const waiversData = readJSON(WAIVERS, { waivers: [] });
  const waived = new Set((waiversData.waivers || []).map((w) => `${w.rule}::${w.file}::${w.pattern}`));
  const active = violations.filter((v) => !waived.has(waiverKey(v)));

  if (active.length === 0) {
    console.log(`arch-gate: PASS — ${files.length} file(s) scanned, no new violations.`);
    process.exit(0);
  }

  console.error(`arch-gate: FAIL — ${active.length} violation(s):\n`);
  for (const v of active) {
    const desc = (config.rules[v.rule] && config.rules[v.rule].description) || '';
    console.error(`  [${v.rule}] ${v.file}:${v.line}  banned "${v.pattern}"`);
    console.error(`      ${v.text}`);
    if (desc) console.error(`      -> ${desc}`);
  }
  console.error(
    `\nFix the violations, or add a waiver to arch-gate.waivers.json if this is accepted pre-existing debt.`,
  );
  process.exit(1);
}

main();
