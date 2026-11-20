import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { login } from '@/app/auth/actions';
import { AuthScaffold } from '@/app/components/auth/auth-scaffold';
import { LOGIN_PANEL } from '@/app/components/auth/auth-content';

/**
 * Login (Presentation layer). Unauthenticated, so it sits OUTSIDE the app shell — the shared
 * split auth layout (AuthScaffold) carries the brand + value panel; this page owns only the form.
 * Credential handling is unchanged: the form posts to the `login` Service-layer action, which
 * delegates to Supabase Auth (secure-coding — we never handle passwords here).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthScaffold
      panelHeading={LOGIN_PANEL.heading}
      panelSubcopy={LOGIN_PANEL.subcopy}
      promises={LOGIN_PANEL.promises}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" component="h1">
          Log in
        </Typography>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Box
          component="form"
          action={login}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            fullWidth
          />
          <TextField
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth>
            Log in
          </Button>
        </Box>

        <Typography variant="body2">
          No account?{' '}
          <Link component={NextLink} href="/signup">
            Sign up
          </Link>
        </Typography>
      </Box>
    </AuthScaffold>
  );
}
