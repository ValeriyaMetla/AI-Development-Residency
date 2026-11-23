import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { AUTH_BRAND } from '../components/auth/auth-content';
import { SiteFooter } from '../components/site-footer';
import { DemoBanner } from './demo-banner';
import { DEMO_CTA } from './demo-content';

/**
 * Frame for every no-login demo screen (ADR-0029). Presentation only: no data, no auth, no model.
 * The route sits outside the signed-in `(app)` group and is excluded from the session middleware,
 * so visiting it runs no auth code and creates no session (ADR-0029 point 1).
 *
 * The banner lives here, not in each page, so no demo screen can leave it off (point 7).
 *
 * Accessibility + UX notes (banner notes are in `demo-banner.tsx`):
 * - One prominent action (Sign up free); the wordmark is a link home, a way out on every width.
 * - The page owns its single <h1>; the banner heading is a <p> so the heading order stays clean.
 */

export const metadata: Metadata = {
  title: 'Demo — Community AI Workflow Studio',
  description: 'Try the safety net on a fictional sample organization. No sign-up, nothing saved.',
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <DemoBanner />

      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Link
            component={NextLink}
            href="/"
            underline="none"
            sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1rem' }}
          >
            {AUTH_BRAND.name}
          </Link>
          <Box
            component="nav"
            aria-label="Account"
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <Link component={NextLink} href="/login">
              {DEMO_CTA.logIn}
            </Link>
            <Button component={NextLink} href="/signup" variant="contained">
              {DEMO_CTA.signUp}
            </Button>
          </Box>
        </Container>
      </Box>

      <Box component="main">{children}</Box>
      <SiteFooter />
    </>
  );
}
