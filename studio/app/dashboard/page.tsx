import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyProfile } from '@/lib/data/profile';
import { signout } from '@/app/auth/actions';
import ThankYouRunner from '@/app/dashboard/thank-you-runner';

const ROLE_LABEL: Record<string, string> = {
  accountable_leader: 'Accountable Leader',
  frontline_doer: 'Frontline Doer',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Defense in depth — the middleware also guards this route.
  if (!user) {
    redirect('/login');
  }

  const profile = await getMyProfile();

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

        {profile ? (
          <Box>
            <Typography variant="body1">
              Organization: <strong>{profile.org?.name ?? '—'}</strong>
            </Typography>
            <Typography variant="body1">
              Role: <strong>{ROLE_LABEL[profile.role] ?? profile.role}</strong>
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            We couldn&apos;t load your profile. Try signing out and back in.
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        <ThankYouRunner />

        <Divider sx={{ my: 1 }} />

        <Box component="form" action={signout}>
          <Button type="submit" variant="outlined">
            Log out
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
