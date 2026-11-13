import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { login } from '@/app/auth/actions';

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
          gap: 2,
          py: 8,
        }}
      >
        <Typography variant="h4" component="h1">
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

        <Typography variant="body2">
          No account?{' '}
          <Link component={NextLink} href="/signup">
            Sign up
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
