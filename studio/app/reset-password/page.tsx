import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { updatePassword } from '@/app/auth/actions';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { AuthScaffold } from '@/app/components/auth/auth-scaffold';
import { RESET_PANEL } from '@/app/components/auth/auth-content';
import { MIN_PASSWORD_LENGTH } from '@/lib/domain/password-reset';

/**
 * Choose a new password (Presentation layer, ADR-0003). Reached from the email link after the
 * /auth/callback route exchanges the one-time code for a short-lived recovery session.
 *
 * If the person opens this page without that session (no email link), there is nothing to update,
 * so we show a plain prompt to request a link instead of a form that could only fail (ux: prevent
 * the error before it happens). The form posts to the `updatePassword` Service-layer action.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();

  return (
    <AuthScaffold
      panelHeading={RESET_PANEL.heading}
      panelSubcopy={RESET_PANEL.subcopy}
      promises={RESET_PANEL.promises}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" component="h1">
          Choose a new password
        </Typography>

        {!user ? (
          <>
            <Alert severity="info" role="status">
              Open the reset link from your email to set a new password — it brings you back to this
              page ready to use.
            </Alert>
            <Typography variant="body2">
              <Link component={NextLink} href="/forgot-password">
                Request a new reset link
              </Link>
            </Typography>
          </>
        ) : (
          <>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Box
              component="form"
              action={updatePassword}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                name="password"
                type="password"
                label="New password"
                autoComplete="new-password"
                required
                fullWidth
                helperText={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              />
              <TextField
                name="confirm_password"
                type="password"
                label="Confirm new password"
                autoComplete="new-password"
                required
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" fullWidth>
                Update password
              </Button>
            </Box>
          </>
        )}
      </Box>
    </AuthScaffold>
  );
}
