/**
 * Security headers (ADR-0033 points 3–4 · PenTest F-06, F-09 · SR-10). Pure, no I/O — shared by the
 * root middleware (page responses, with a fresh nonce) and next.config.ts (every response, and the
 * no-login demo, which runs no middleware — ADR-0029).
 *
 * The content security policy is strict where the real risk is: only scripts the server stamps with
 * this request's nonce can run ('strict-dynamic' lets those scripts load the app's own chunks). Inline
 * STYLES stay allowed, because MUI injects them; style injection is far lower risk than script
 * injection (accepted in ADR-0033). frame-ancestors 'none' is the clickjacking fix.
 *
 * The demo has no nonce (no middleware), so its policy allows inline scripts; it has no sign-in, no
 * data and only fixed sample text, so there is nothing for an injected script to reach.
 */

export function buildContentSecurityPolicy(options: { nonce?: string; dev: boolean }): string {
  const { nonce, dev } = options;
  // Local development only: React's hot reload needs eval, and the dev server talks over a websocket.
  const devScript = dev ? " 'unsafe-eval'" : '';
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devScript}`
    : `script-src 'self' 'unsafe-inline'${devScript}`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    dev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** A fresh, unguessable nonce for one request: 16 random bytes, base64. Works in the edge runtime. */
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Sent on every response (next.config.ts). HSTS is already added by Vercel (PenTest S13, PASS). */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
