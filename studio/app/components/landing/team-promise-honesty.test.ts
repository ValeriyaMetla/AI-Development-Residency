import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/**
 * Honesty guard for the "team" story
 * (card "Make the team promises true until teammates can join").
 *
 * Today one sign-up creates one organization with one person; inviting teammates is deferred to
 * MMP (card "Let a leader invite teammates to their organization", ADR-0041). So the public
 * team-story surfaces must NOT promise that more than one person can use an account today. This
 * test reads their source and fails if a banned team-promise phrase comes back — and it pins the
 * "coming soon" disclaimer in place so it can't be silently dropped. When invites actually ship,
 * update this guard together with the copy.
 */

// The team-story surfaces the card put in scope (landing hero / how-it-works / who-it's-for + demo).
// Paths are resolved from this test file's location.
const SURFACES = [
  './hero.tsx',
  './how-it-works.tsx',
  './who-its-for.tsx',
  '../../demo/demo-content.ts',
] as const;

// Phrases that promise multi-person use *today*. These are specific over-claims — NOT the bare word
// "team", so "mission-driven teams" (the audience) and "For the team — coming soon" (the honest
// disclaimer) stay allowed.
const BANNED_TEAM_PROMISES = [
  'your team drafts',
  'your whole team',
  'whole team',
  'with your team',
  "your team's",
  'your team gets',
  'your team works',
  'invite your team',
  'your entire team',
];

function sourceOf(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8').toLowerCase();
}

describe('team-promise honesty guard', () => {
  it('no team-story surface promises multi-person use today', () => {
    for (const rel of SURFACES) {
      const src = sourceOf(rel);
      for (const phrase of BANNED_TEAM_PROMISES) {
        expect(
          src,
          `${rel} must not promise team use ("${phrase}") until invites ship`,
        ).not.toContain(phrase);
      }
    }
  });

  it("keeps the 'teammates coming soon' disclaimer on the who-it's-for panel", () => {
    const src = sourceOf('./who-its-for.tsx');
    expect(src).toContain('coming soon');
    expect(src).toContain('inviting teammates is coming');
  });
});
