'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Design tokens for the app (ADR-0005: Material UI).
 *
 * Rule (Week 4 reference, "theme tokens only"): colors, spacing, and typography
 * come from this theme — never hardcoded in components — so the design system
 * and color contrast / accessibility stay managed in one place.
 *
 * Marked "use client" because the App Router layout imports it inside the
 * Material UI client boundary (ThemeProvider).
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0' },
    secondary: { main: '#00897b' },
  },
  typography: {
    fontFamily: 'var(--font-roboto), system-ui, Arial, sans-serif',
  },
});

export default theme;
