import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { signup } from '@/app/auth/actions';

/**
 * Signup (Presentation layer). Unauthenticated, so it sits OUTSIDE the app shell — the same light,
 * branded auth layout as login, themed by the shared design tokens.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <Container maxWidth="xs">
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
          py: 8,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Community AI Workflow Studio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use AI safely and fairly.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="h5" component="h1">
              Create your account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You&apos;ll be set up as the Accountable Leader of a new organization.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {message === 'check-email' ? (
            <Alert severity="success">
              Account created — check your email to confirm it, then log in.
            </Alert>
          ) : null}

          <Box
            component="form"
            action={signup}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField name="display_name" label="Your name" autoComplete="name" fullWidth />
            <TextField name="org_name" label="Organization name" required fullWidth />
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
              autoComplete="new-password"
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large">
              Create account
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link component={NextLink} href="/login">
            Log in
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
