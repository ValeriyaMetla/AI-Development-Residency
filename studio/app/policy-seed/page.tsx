import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import PolicySeedWizard from '@/app/policy-seed/policy-seed-wizard';

/**
 * Policy-seed intake route (Presentation layer). Guards the session, then renders the
 * guided wizard. The "org already has a policy" gate + a dashboard entry point are a later
 * sub-task; this page just hosts the flow.
 */
export default async function PolicySeedPage() {
  const user = await getCurrentUser();

  // Defense in depth — middleware also guards this route.
  if (!user) {
    redirect('/login');
  }

  return (
    <Container maxWidth="sm">
      <Box
        component="main"
        sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', gap: 3, py: 6 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Set your AI rules
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Answer a few plain questions and we&apos;ll draft a starter AI policy for your
            organization — grounded in recognized standards. Takes about five minutes.
          </Typography>
        </Box>

        <PolicySeedWizard />
      </Box>
    </Container>
  );
}
