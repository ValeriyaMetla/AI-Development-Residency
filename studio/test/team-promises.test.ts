import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Honesty guard — card "Make the team promises true until teammates can join".
 *
 * Today one sign-up makes one organization with one person: nobody can invite a teammate yet (that's
 * the MMP card "Let a leader invite teammates to their organization"). So the public pages must not
 * promise team use. This reads the source of every public page that carried a team promise and fails
 * if one comes back. When invites ship, delete this test together with restoring the team wording.
 */

const PUBLIC_COPY_FILES = [
  'app/components/landing/hero.tsx',
  'app/components/landing/how-it-works.tsx',
  'app/components/landing/who-its-for.tsx',
  'app/components/auth/auth-content.ts',
  'app/demo/demo-content.ts',
];

// Lower-cased phrases that say several people can use one account today.
const BANNED_TEAM_PROMISES = [
  'your team drafts',
  'your team always gets',
  'your whole team',
  'your team works inside',
  'try it with your team',
  'your team gets',
  "everyone's ai use",
];

const read = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8').toLowerCase();

describe('public pages make no team promise before invites exist', () => {
  it.each(PUBLIC_COPY_FILES)('%s', (file) => {
    const text = read(file);
    for (const phrase of BANNED_TEAM_PROMISES) {
      expect(text, `${file} must not say "${phrase}"`).not.toContain(phrase);
    }
  });

  it('keeps the team story, but says plainly that inviting teammates is coming', () => {
    const text = read('app/components/landing/who-its-for.tsx');
    expect(text).toContain('coming soon');
    expect(text).toContain('inviting teammates is coming');
  });
});
