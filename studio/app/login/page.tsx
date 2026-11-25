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
  searchParams: Promise<{ error?: string; reason?: string; message?: string }>;
}) {
  const { error, reason, message } = await searchParams;
  // ADR-0033: the middleware signs a user out after 1 hour idle or 24 hours; say why, plainly. Only a
  // fixed message is shown for the known reason — the query value itself is never displayed.
  const signedOut = reason === 'signed-out';
  // Set after a successful password reset. Again, a fixed message keyed off a known value only.
  const passwordUpdated = message === 'password-updated';

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

        {signedOut ? (
          <Alert severity="info" role="status">
            For your security, you were signed out. Please log in again.
          </Alert>
        ) : null}
        {passwordUpdated ? (
          <Alert severity="success" role="status">
            Your password has been updated. Please log in with your new password.
          </Alert>
        ) : null}
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
          <Link component={NextLink} href="/forgot-password">
            Forgot your password?
          </Link>
        </Typography>

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
