import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS, buildContentSecurityPolicy, makeNonce } from '@/lib/security/headers';
import nextConfig from '@/next.config';

/**
 * Security headers (ADR-0033 points 3–4 · PenTest F-06, F-09 · SR-10). A content security policy that
 * is strict for scripts (a fresh nonce per request; MUI's inline styles still allowed), frame-ancestors
 * 'none' so no other site can frame the app, the hardening headers, and no x-powered-by.
 */

const directive = (csp: string, name: string) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `)) ?? '';

describe('buildContentSecurityPolicy — page responses (with a nonce)', () => {
  const csp = buildContentSecurityPolicy({ nonce: 'abc123', dev: false });

  it('only lets scripts stamped with the nonce run', () => {
    const scripts = directive(csp, 'script-src');
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('stops other sites framing the app (the clickjacking fix)', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
  });

  it('locks down plugins, base URLs, form targets, connections and fonts to the app itself', () => {
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(csp, 'font-src')).toContain("'self'");
  });

  it("allows inline styles (MUI needs them), and nothing else that's inline", () => {
    expect(directive(csp, 'style-src')).toBe("style-src 'self' 'unsafe-inline'");
  });

  it('only loosens script rules for local development (hot reload needs eval)', () => {
    const dev = buildContentSecurityPolicy({ nonce: 'abc123', dev: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });
});

describe('buildContentSecurityPolicy — the demo (no middleware, so no nonce)', () => {
  const csp = buildContentSecurityPolicy({ dev: false });

  it("still forbids framing and plugins, but allows the demo's inline scripts", () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'unsafe-inline'");
  });
});

describe('makeNonce', () => {
  it('is fresh every time and long enough to be unguessable', () => {
    const a = makeNonce();
    const b = makeNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/); // 16 random bytes, base64
  });
});

describe('hardening headers', () => {
  const byName = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));

  it('sets each required header', () => {
    expect(byName['X-Frame-Options']).toBe('DENY');
    expect(byName['X-Content-Type-Options']).toBe('nosniff');
    expect(byName['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(byName['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(byName['Cross-Origin-Opener-Policy']).toBe('same-origin');
  });
});

describe('next.config', () => {
  it('stops advertising the framework (no x-powered-by)', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('sends the hardening headers on every path, and a policy on the demo', async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === '/:path*');
    expect(all?.headers).toEqual(SECURITY_HEADERS);
    for (const source of ['/demo', '/demo/:path*']) {
      const demo = rules.find((r) => r.source === source);
      expect(demo?.headers.find((h) => h.key === 'Content-Security-Policy')?.value).toContain(
        "frame-ancestors 'none'",
      );
    }
  });
});
