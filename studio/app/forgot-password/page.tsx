import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { requestPasswordReset } from '@/app/auth/actions';
import { AuthScaffold } from '@/app/components/auth/auth-scaffold';
import { RESET_PANEL } from '@/app/components/auth/auth-content';
import { RESET_REQUEST_CONFIRMATION } from '@/lib/domain/password-reset';

/**
 * Request a password reset (Presentation layer, ADR-0003). Unauthenticated, so it reuses the shared
 * split auth layout like /login and /signup. The form posts to the `requestPasswordReset`
 * Service-layer action; this page only renders the form and the two flat statuses it returns.
 *
 * On success we show a neutral confirmation and hide the form — the message is the same whether or
 * not the email has an account (secure-coding A07), so it never hints at who is registered.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const sent = message === 'sent';

  return (
    <AuthScaffold
      panelHeading={RESET_PANEL.heading}
      panelSubcopy={RESET_PANEL.subcopy}
      promises={RESET_PANEL.promises}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" component="h1">
          Reset your password
        </Typography>

        {sent ? (
          <Alert severity="success" role="status">
            {RESET_REQUEST_CONFIRMATION}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Enter the email you signed up with and we&apos;ll send a link to choose a new
              password.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Box
              component="form"
              action={requestPasswordReset}
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
              <Button type="submit" variant="contained" size="large" fullWidth>
                Send reset link
              </Button>
            </Box>
          </>
        )}

        <Typography variant="body2">
          <Link component={NextLink} href="/login">
            Back to log in
          </Link>
        </Typography>
      </Box>
    </AuthScaffold>
  );
}
