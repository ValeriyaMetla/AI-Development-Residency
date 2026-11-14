import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import { getMyProfile } from '@/lib/data/profile';
import { getMyOrgId } from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';
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
  const orgId = await getMyOrgId();
  const activePolicy = orgId ? await getActivePolicy(orgId) : null;

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

        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" component="h2">
              Your AI rules
            </Typography>
            {activePolicy ? <Chip size="small" color="success" label="Active" /> : null}
          </Box>
          {activePolicy ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Your organization has an active AI policy. It applies to AI use across the Studio.
              </Typography>
              <Box>
                <Button variant="outlined" component={NextLink} href="/policy-seed">
                  Review or update your rules
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Set your organization&apos;s AI rules once. Answer a few plain questions and
                we&apos;ll draft a starter policy grounded in recognized standards — about five
                minutes.
              </Typography>
              <Box>
                <Button variant="contained" component={NextLink} href="/policy-seed">
                  Set your AI rules
                </Button>
              </Box>
            </>
          )}
        </Paper>

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
