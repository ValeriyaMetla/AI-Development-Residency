import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { login } from '@/app/auth/actions';

/**
 * Login (Presentation layer). Unauthenticated, so it sits OUTSIDE the app shell — a light,
 * branded auth layout (brand wordmark + a single card), themed by the shared design tokens.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
            <Button type="submit" variant="contained" size="large">
              Log in
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          No account?{' '}
          <Link component={NextLink} href="/signup">
            Sign up
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
