'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { DEMO_BANNER } from './demo-content';

/**
 * The banner every demo screen carries (ADR-0029 point 7). A client component only because its
 * amber tint is computed from the theme (`alpha`), and a theme function can't cross from a server
 * component into MUI (the same reason `auth-scaffold.tsx` is a client component). No data, no state.
 *
 * Accessibility: a labelled static region, not an alert, so it's read in order and never
 * interrupts. Its meaning is in its words; the tint only supports them, and the text stays
 * `text.primary` on a light tint for AA contrast.
 */
export function DemoBanner() {
  return (
    <Box
      component="section"
      aria-labelledby="demo-banner-heading"
      sx={{
        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14),
        borderBottom: 1,
        borderColor: (theme) => alpha(theme.palette.warning.main, 0.5),
        py: 1.5,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          id="demo-banner-heading"
          component="p"
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'text.primary' }}
        >
          {DEMO_BANNER.heading}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
          {DEMO_BANNER.detail}
        </Typography>
      </Container>
    </Box>
  );
}
