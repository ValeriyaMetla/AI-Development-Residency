'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Design tokens for the app (ADR-0005: Material UI).
 *
 * Rule (Week 4 reference, "theme tokens only"): colors, spacing, and typography
 * come from this theme — never hardcoded in components — so the design system
 * and color contrast / accessibility stay managed in one place.
 *
 * Palette is tuned for WCAG 2.2 AA contrast: primary/secondary carry white text
 * at >= 4.5:1, and text.secondary clears 4.5:1 on both paper and the default
 * background. Font is self-hosted Roboto (ADR-0017, via @fontsource in the root
 * layout), so the family is a plain "Roboto" — no next/font CSS variable.
 * Marked "use client" because the App Router layout imports it inside the
 * Material UI client boundary (ThemeProvider).
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1557b0', dark: '#0f4391', contrastText: '#ffffff' },
    secondary: { main: '#00695c', contrastText: '#ffffff' },
    success: { main: '#1b7a43', contrastText: '#ffffff' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    text: { primary: '#1a2129', secondary: '#4a5568' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, system-ui, Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default theme;
