import type { NextConfig } from 'next';
import { SECURITY_HEADERS, buildContentSecurityPolicy } from './lib/security/headers';

/**
 * Security headers (ADR-0033 point 4 · PenTest F-06, F-09). The hardening headers go on every
 * response; page responses get their nonce-based content security policy from the middleware. The
 * no-login demo runs no middleware (ADR-0029), so it gets a static policy here.
 */
const demoPolicy = [
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy({ dev: process.env.NODE_ENV !== 'production' }),
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework (PenTest F-09).
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/demo', headers: demoPolicy },
      { source: '/demo/:path*', headers: demoPolicy },
    ];
  },
};

export default nextConfig;
