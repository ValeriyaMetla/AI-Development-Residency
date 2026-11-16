#!/usr/bin/env node
/**
 * skills-gate.mjs — deterministic Claude Skills integrity gate (zero dependencies).
 *
 * Gate-checks the Week 1 Claude Skills on every push (Week 5 assignment). It proves the
 * STRUCTURE of every `.claude/skills/<name>/SKILL.md` and the SYNC between those real Skill
 * files and the `docs/SKILLS-LIBRARY.md` index. It does NOT judge a Skill's quality, triggering,
 * usefulness, or correctness (that is `skill-evaluation`), never calls Claude, and needs no
 * credentials. Decision recorded in ADR-0016.
 *
 * Modes:
 *   node scripts/skills-gate.mjs structure   # validate each SKILL.md
 *   node scripts/skills-gate.mjs sync         # validate SKILL dirs <-> SKILLS-LIBRARY.md
 *   node scripts/skills-gate.mjs all          # both (local default)
 *
 * Test/fixture flags (production uses repo defaults):
 *   --root <dir>            base dir (default: process.cwd())
 *   --skills-dir <dir>      skills root (default: <root>/.claude/skills)
 *   --library <file>        index file (default: <root>/docs/SKILLS-LIBRARY.md)
 *
 * Output: one diagnostic per line as `ERROR_CODE  path: explanation`, sorted. Exit 0 only when
 * the selected mode has no blocking diagnostics; otherwise exit 1. Exit 2 on bad usage.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const ALLOWED_TOP_KEYS = new Set(['name', 'description', 'metadata', 'allowed-tools', 'license']);
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^\d+\.\d+(?:\.\d+)?$/;
const FORBIDDEN_NAME_PREFIX = /^(claude|anthropic)/i;
const MAX_DESCRIPTION = 1024;

// ---- argument parsing -------------------------------------------------------

function parseArgs(argv) {
  const opts = { mode: 'all', root: process.cwd() };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') opts.root = argv[++i];
    else if (a === '--skills-dir') opts.skillsDir = argv[++i];
    else if (a === '--library') opts.library = argv[++i];
    else if (a.startsWith('--')) return { error: `unknown flag: ${a}` };
    else positional.push(a);
  }
  if (positional.length > 1) return { error: `too many arguments: ${positional.join(' ')}` };
  if (positional.length === 1) opts.mode = positional[0];
  if (!['structure', 'sync', 'all'].includes(opts.mode)) {
    return { error: `unknown mode "${opts.mode}" (use structure|sync|all)` };
  }
  opts.skillsDir = opts.skillsDir || join(opts.root, '.claude', 'skills');
  opts.library = opts.library || join(opts.root, 'docs', 'SKILLS-LIBRARY.md');
  return { opts };
}

// ---- helpers ----------------------------------------------------------------

function rel(root, p) {
  return relative(root, p).split('\\').join('/');
}

function listSkillDirs(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

// Split a SKILL.md into { frontmatter, body } or null if no closing delimiter.
// Accepts CRLF or LF.
function splitFrontmatter(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!/^---\n/.test(t)) return null;
  const close = t.indexOf('\n---', 3);
  if (close === -1) return null;
  const frontmatter = t.slice(4, close);
  const afterClose = t.slice(close + 4).replace(/^[^\n]*\n?/, ''); // drop rest of the '---' line
  return { frontmatter, body: afterClose };
}

/**
 * Parse the repository's canonical zero-dependency YAML subset:
 *   top-level scalar keys `key: value`, plus one indented `metadata:` mapping (2-space indent).
 * Returns { ok, fields, meta, error }. `error` set means FRONTMATTER_INVALID.
 */
function parseCanonicalFrontmatter(fm) {
  if (/\t/.test(fm)) return { ok: false, error: 'tab character is not allowed in frontmatter' };
  const lines = fm.split('\n');
  const fields = {};
  const meta = {};
  const seenTop = new Set();
  let inMetadata = false;
  for (const raw of lines) {
    if (raw.trim() === '') {
      inMetadata = false;
      continue;
    }
    const indent = raw.match(/^ */)[0].length;
    if (indent === 0) {
      inMetadata = false;
      const m = raw.match(/^([A-Za-z0-9_-]+):(.*)$/);
      if (!m) return { ok: false, error: `cannot parse line: "${raw}"` };
      const key = m[1];
      const value = m[2].trim();
      if (seenTop.has(key)) return { ok: false, error: `duplicate key: "${key}"` };
      seenTop.add(key);
      if (key === 'metadata') {
        if (value !== '') return { ok: false, error: 'metadata must be a mapping, not a scalar' };
        inMetadata = true;
      } else {
        fields[key] = value;
      }
    } else if (indent === 2 && inMetadata) {
      const m = raw.match(/^ {2}([A-Za-z0-9_-]+):(.*)$/);
      if (!m) return { ok: false, error: `cannot parse metadata line: "${raw}"` };
      meta[m[1]] = m[2].trim();
    } else {
      return { ok: false, error: `malformed indentation: "${raw}"` };
    }
  }
  return { ok: true, fields, meta, topKeys: [...seenTop] };
}

// Extract relative Markdown link targets (skip http(s), anchors, mailto, and [[wikilinks]]).
function relativeLinks(text) {
  const out = [];
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    out.push(target.split('#')[0]);
  }
  return out;
}

// ---- structure mode ---------------------------------------------------------

function checkStructure(opts, add) {
  const dirs = listSkillDirs(opts.skillsDir);
  if (dirs.length === 0) {
    add('NO_SKILLS_FOUND', rel(opts.root, opts.skillsDir), 'no skill directories found');
    return dirs;
  }
  const names = new Map();
  for (const dir of dirs) {
    const skillPath = join(opts.skillsDir, dir, 'SKILL.md');
    const p = rel(opts.root, skillPath);

    if (existsSync(join(opts.skillsDir, dir, 'README.md'))) {
      add('README_FORBIDDEN', rel(opts.root, join(opts.skillsDir, dir, 'README.md')),
        'a Skill directory must not contain README.md; put detail in SKILL.md or references/');
    }

    if (!existsSync(skillPath) || !statSync(skillPath).isFile()) {
      add('SKILL_FILE_MISSING', p, 'every Skill directory needs a regular SKILL.md');
      continue;
    }
    const text = readFileSync(skillPath, 'utf8');
    if (text.trim() === '') {
      add('SKILL_FILE_MISSING', p, 'SKILL.md is empty');
      continue;
    }

    const split = splitFrontmatter(text);
    if (!split) {
      add('FRONTMATTER_MISSING', p, 'file must open with --- and have a closing --- before the body');
      continue;
    }

    if (/[<>]/.test(split.frontmatter)) {
      add('FRONTMATTER_CHARACTER_FORBIDDEN', p, 'frontmatter must not contain < or >');
    }

    const parsed = parseCanonicalFrontmatter(split.frontmatter);
    if (!parsed.ok) {
      add('FRONTMATTER_INVALID', p, parsed.error);
      continue;
    }
    for (const key of parsed.topKeys) {
      if (!ALLOWED_TOP_KEYS.has(key)) {
        add('UNKNOWN_FRONTMATTER_KEY', p, `unknown top-level key "${key}"; update the Skills Library to permit it first`);
      }
    }

    const name = parsed.fields.name;
    const description = parsed.fields.description;
    const hasMetadata = parsed.topKeys.includes('metadata');
    const version = parsed.meta.version;

    if (!name) add('REQUIRED_FIELD_MISSING', p, 'missing non-empty "name"');
    if (!description) add('REQUIRED_FIELD_MISSING', p, 'missing non-empty "description"');
    if (!hasMetadata) add('REQUIRED_FIELD_MISSING', p, 'missing "metadata" mapping');
    if (!version) add('REQUIRED_FIELD_MISSING', p, 'missing non-empty "metadata.version"');

    if (name) {
      if (!NAME_RE.test(name)) add('NAME_INVALID', p, `name "${name}" must be kebab-case`);
      if (FORBIDDEN_NAME_PREFIX.test(name)) add('NAME_PREFIX_FORBIDDEN', p, `name "${name}" must not start with "claude" or "anthropic"`);
      if (name !== dir) add('NAME_FOLDER_MISMATCH', p, `name "${name}" must match folder "${dir}"`);
      if (names.has(name)) add('NAME_DUPLICATE', p, `duplicate skill name "${name}" (also ${names.get(name)})`);
      else names.set(name, dir);
    }
    if (description && description.length > MAX_DESCRIPTION) {
      add('DESCRIPTION_INVALID', p, `description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
    }
    if (version && !VERSION_RE.test(version)) {
      add('VERSION_INVALID', p, `metadata.version "${version}" must be major.minor or major.minor.patch`);
    }

    // body checks
    const bodyLines = split.body.split('\n');
    const firstNonBlank = bodyLines.find((l) => l.trim() !== '') || '';
    if (!/^#\s+\S/.test(firstNonBlank)) {
      add('BODY_INVALID', p, 'first non-blank body line must be an H1 title');
    }
    const h2 = [...split.body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
    const idxIntent = h2.findIndex((x) => /^Intent\b/i.test(x));
    const idxChecklist = h2.findIndex((x) => /^Checklist\b/i.test(x));
    const idxWhen = h2.findIndex((x) => /^When unsure\b/i.test(x));
    const idxBased = h2.findIndex((x) => /^Based on\b/i.test(x));
    const missing = [];
    if (idxIntent === -1) missing.push('## Intent');
    if (idxChecklist === -1) missing.push('## Checklist …');
    if (idxWhen === -1) missing.push('## When unsure');
    if (idxBased === -1) missing.push('## Based on');
    if (missing.length) {
      add('CORE_SECTION_MISSING', p, `missing required section(s): ${missing.join(', ')}`);
    } else {
      const ordered = idxIntent === 0 && idxChecklist > 1 && idxWhen > idxChecklist && idxBased > idxWhen;
      if (!ordered) {
        add('CORE_SECTION_ORDER', p, 'order must be Intent → (≥1 rule section) → Checklist → When unsure → Based on');
      }
    }

    // relative links from SKILL.md must resolve inside the repo
    for (const link of relativeLinks(text)) {
      const resolved = resolve(dirname(skillPath), link);
      if (!existsSync(resolved)) {
        add('SKILL_REFERENCE_MISSING', p, `relative link does not resolve: ${link}`);
      }
    }
  }
  return dirs;
}

// ---- sync mode --------------------------------------------------------------

// Parse canonical per-skill entries: `### <name> <✅|🔨|⬜>` and the SKILL.md link in that section.
function parseLibraryEntries(libraryText) {
  const lines = libraryText.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  let current = null;
  const headingRe = /^###\s+([a-z0-9][a-z0-9-]*)\s+(✅|🔨|⬜)/;
  for (const line of lines) {
    const h = line.match(headingRe);
    if (h) {
      if (current) entries.push(current);
      current = { name: h[1], status: h[2], links: [] };
      continue;
    }
    if (/^###\s/.test(line) && current) {
      entries.push(current);
      current = null;
    }
    if (current) {
      for (const m of line.matchAll(/\]\(([^)]+)\)/g)) current.links.push(m[1].trim());
    }
  }
  if (current) entries.push(current);
  return entries;
}

function checkSync(opts, dirs, add) {
  const p = rel(opts.root, opts.library);
  if (!existsSync(opts.library)) {
    add('LIBRARY_MISSING', p, 'docs/SKILLS-LIBRARY.md not found');
    return;
  }
  const text = readFileSync(opts.library, 'utf8');
  const entries = parseLibraryEntries(text);

  const seen = new Map();
  const built = new Map();
  for (const e of entries) {
    const count = (seen.get(e.name) || 0) + 1;
    seen.set(e.name, count);
    if (count === 2) add('LIBRARY_ENTRY_DUPLICATE', p, `skill name "${e.name}" appears more than once`);
    if (e.status === '✅') built.set(e.name, e);
  }

  const dirSet = new Set(dirs);

  // every real skill dir -> one built entry
  for (const dir of dirs) {
    if (!built.has(dir)) {
      const e = entries.find((x) => x.name === dir);
      if (!e) add('LIBRARY_BUILT_ENTRY_MISSING', p, `skill "${dir}" has no "### ${dir} ✅" entry`);
      else add('LIBRARY_BUILT_ENTRY_MISSING', p, `skill "${dir}" is present but marked ${e.status}, not built (✅)`);
    }
  }

  // every built entry -> one real skill dir, with a correct canonical link
  const expectLink = (name) => `../.claude/skills/${name}/SKILL.md`;
  for (const [name, e] of built) {
    if (!dirSet.has(name)) {
      add('LIBRARY_ENTRY_STALE', p, `built entry "${name}" has no .claude/skills/${name}/ directory`);
      continue;
    }
    const skillLinks = e.links.filter((l) => /\.claude\/skills\/.*SKILL\.md$/.test(l));
    if (skillLinks.length === 0) {
      add('LIBRARY_LINK_MISSING', p, `built entry "${name}" is missing its ${expectLink(name)} link`);
    } else if (!skillLinks.includes(expectLink(name))) {
      add('LIBRARY_LINK_MISMATCH', p, `built entry "${name}" link does not match; expected ${expectLink(name)}`);
    }
  }

  // built-entry count must equal the real skill count
  if (built.size !== dirs.length) {
    add('LIBRARY_BUILT_COUNT_MISMATCH', p, `built entries (${built.size}) != real skills (${dirs.length})`);
  }

  // every relative markdown link in the library resolves from docs/
  const libDir = dirname(opts.library);
  for (const link of relativeLinks(text)) {
    const resolved = resolve(libDir, link);
    if (!existsSync(resolved)) {
      add('LIBRARY_LOCAL_REFERENCE_MISSING', p, `relative link does not resolve: ${link}`);
    }
  }

  return { builtCount: built.size, plannedCount: entries.filter((e) => e.status === '⬜').length };
}

// ---- main -------------------------------------------------------------------

function main() {
  const { opts, error } = parseArgs(process.argv.slice(2));
  if (error) {
    console.error(`skills-gate: ${error}`);
    process.exit(2);
  }
  const findings = [];
  const add = (code, path, message) => findings.push({ code, path, message });

  let dirs = [];
  if (opts.mode === 'structure' || opts.mode === 'all') dirs = checkStructure(opts, add);
  else dirs = listSkillDirs(opts.skillsDir);

  let syncInfo;
  if (opts.mode === 'sync' || opts.mode === 'all') syncInfo = checkSync(opts, dirs, add);

  findings.sort(
    (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message),
  );

  const label =
    opts.mode === 'structure'
      ? 'Claude Skills — Structure'
      : opts.mode === 'sync'
        ? 'Claude Skills — Library sync'
        : 'Claude Skills — Structure + Sync';

  if (findings.length === 0) {
    const detail =
      opts.mode === 'sync' && syncInfo
        ? `${dirs.length} Skill files, ${syncInfo.builtCount} built entries, ${syncInfo.plannedCount} planned (${rel(opts.root, opts.library)})`
        : `${dirs.length} Skills`;
    console.log(`${label}: PASS (${detail})`);
    process.exit(0);
  }

  for (const f of findings) console.error(`${f.code}  ${f.path}: ${f.message}`);
  console.error(`\n${label}: FAIL (${findings.length} problem${findings.length === 1 ? '' : 's'})`);
  process.exit(1);
}

main();
