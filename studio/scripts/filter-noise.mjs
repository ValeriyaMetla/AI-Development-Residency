#!/usr/bin/env node
/**
 * filter-noise — run a command, pass its output through, but drop the known-harmless
 * @supabase/supabase-js "Node.js 20 and below are deprecated" line so local verify output
 * stays scannable. The warning has no opt-out flag and only stops on Node >= 21; the real fix
 * (moving the toolchain to Node 22) is tracked separately — see docs/BUILD-RULEBOOK.md.
 *
 * It NEVER masks a failure: the child's exit code (or terminating signal) is propagated
 * unchanged. This deliberately avoids the `<cmd> | grep` pitfall, where grep's own exit code
 * hides a failing build.
 *
 * Usage: node scripts/filter-noise.mjs <command> [args...]
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('filter-noise: no command given');
  process.exit(2);
}

const NOISE = /no longer be supported in future versions of @supabase\/supabase-js/;

const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] });

for (const stream of [child.stdout, child.stderr]) {
  createInterface({ input: stream }).on('line', (line) => {
    if (!NOISE.test(line)) process.stdout.write(`${line}\n`);
  });
}

child.on('error', (err) => {
  console.error(`filter-noise: ${err.message}`);
  process.exit(1);
});
child.on('close', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
