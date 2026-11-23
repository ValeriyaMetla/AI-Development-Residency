import type { Metadata } from 'next';
import { headers } from 'next/headers';
// Roboto is self-hosted via @fontsource — no build-time Google Fonts fetch, which was
// flaky on CI and intermittently failed `next build`. See ADR-0017.
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Community AI Workflow Studio',
  description: 'Helping small nonprofits use AI safely and fairly.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The content-security-policy nonce the middleware stamped on this request (ADR-0033 point 3), so
  // MUI's injected styles carry it. Absent on the demo (no middleware), which uses a static policy.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ nonce }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
