import { describe, expect, it } from 'vitest';
import { config } from '../middleware';

// ADR-0029 point 1: the no-login demo runs no auth code, so the session middleware must skip
// /demo and /demo/…, and nothing else. This compiles the matcher as a plain regular expression,
// which approximates how Next.js reads it; the browser's network log on /demo is the real proof.

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe('session middleware matcher (ADR-0029)', () => {
  it.each(['/demo', '/demo/', '/demo/run'])('skips the demo path %s', (path) => {
    expect(matcher.test(path)).toBe(false);
  });

  it.each(['/', '/dashboard', '/login', '/approvals', '/demonstration', '/demos'])(
    'still runs on %s',
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );

  it('still skips static assets and images', () => {
    expect(matcher.test('/_next/static/chunk.js')).toBe(false);
    expect(matcher.test('/logo.svg')).toBe(false);
  });
});
