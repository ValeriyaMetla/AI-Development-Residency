import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { signout } from '@/app/auth/actions';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Defense in depth — the middleware also guards this route.
  if (!user) {
    redirect('/login');
  }

  return (
    <Container maxWidth="sm">
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
          You&apos;re signed in
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {user.email}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your organization and role were created at sign-up. Showing them here needs the
          data-access policies from Step 5.
        </Typography>

        <Box component="form" action={signout}>
          <Button type="submit" variant="outlined">
            Log out
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
