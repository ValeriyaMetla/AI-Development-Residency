'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { alpha } from '@mui/material/styles';
import { AUTH_BRAND } from './auth-content';

/**
 * Shared auth layout (Presentation layer, ADR-0003) for the unauthenticated /login and /signup
 * pages — a split screen: a soft branded value panel beside the form. It owns the page's <main>
 * landmark and the brand wordmark; each page passes its own panel copy and its own form.
 *
 * Accessibility + UX notes:
 * - Blue is an accent only: the panel is a ~5% primary tint (theme token via `alpha`, not a
 *   hardcoded color), so text keeps WCAG AA contrast and the one bold blue is the submit button.
 * - The form sits in its own column; the page's <h1> is the form heading ("Log in" /
 *   "Create your account"), while the panel heading is a <p> so the heading order stays clean.
 * - On phones the detailed value list is hidden so the form, the task, is what's in view; the
 *   wordmark (a link home — a way out) stays visible on every width.
 * - The check icon is decorative (aria-hidden); each promise's meaning is in its text, never in
 *   color alone. The promises render as a real list so a screen reader announces them as a set.
 */

function CheckIcon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: 20, height: 20, flexShrink: 0, color: 'success.main' }}
    >
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
    </Box>
  );
}

function BrandWordmark() {
  return (
    <Box>
      <Link
        component={NextLink}
        href="/"
        underline="none"
        sx={{
          color: 'text.primary',
          fontWeight: 700,
          fontSize: '1rem',
          display: 'inline-block',
        }}
      >
        {AUTH_BRAND.name}
      </Link>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {AUTH_BRAND.tagline}
      </Typography>
    </Box>
  );
}

export function AuthScaffold({
  panelHeading,
  panelSubcopy,
  promises,
  children,
}: {
  panelHeading: string;
  panelSubcopy: string;
  promises: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <Box
        sx={{
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
          borderColor: 'divider',
          borderBottom: { xs: 1, md: 0 },
          borderRight: { md: 1 },
          px: { xs: 3, md: 6 },
          py: { xs: 4, md: 8 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <BrandWordmark />

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Typography
            variant="h5"
            component="p"
            sx={{ fontWeight: 700, lineHeight: 1.3, maxWidth: '26rem' }}
          >
            {panelHeading}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2, maxWidth: '26rem' }}>
            {panelSubcopy}
          </Typography>

          <Box
            component="ul"
            aria-label="What you get"
            sx={{
              listStyle: 'none',
              p: 0,
              m: 0,
              mt: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {promises.map((promise) => (
              <Box
                component="li"
                key={promise}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <CheckIcon />
                <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                  {promise}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          px: 3,
          py: { xs: 5, md: 8 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="xs" disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
