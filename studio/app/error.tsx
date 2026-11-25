'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import NextLink from 'next/link';
import { AUTH_BRAND } from '@/app/components/auth/auth-content';

/**
 * Branded error boundary (Presentation layer). Next.js renders this when a route segment throws,
 * replacing the default error screen. It must be a Client Component and receives `reset()` to retry.
 *
 * Security (secure-coding A09): the raw error is NEVER shown to the user — it's logged to the
 * console (and carries a `digest` for server-side correlation), and the page shows a single generic
 * message. No stack traces or internal details leak to the browser UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for diagnostics; do not surface details to the user.
    console.error(error);
  }, [error]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          {AUTH_BRAND.name}
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{ mt: 1, mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}
        >
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          An unexpected error occurred. You can try again, or head back home.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'center' }}
        >
          <Button onClick={reset} variant="contained" size="large">
            Try again
          </Button>
          <Button component={NextLink} href="/" variant="outlined" size="large">
            Back to home
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
