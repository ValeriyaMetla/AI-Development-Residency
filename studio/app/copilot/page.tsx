import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/supabase/server';
import CopilotForm from '@/app/copilot/copilot-form';

/**
 * Governance Co-Pilot route (Presentation layer, Epic 4 / ADR-0010). Guards the session, then
 * renders the "should we use AI for this?" flow. No logic here — a pure view (ADR-0003 Leak Test).
 */
export default async function CopilotPage() {
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
            Should we use AI for this?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Describe what you&apos;re thinking of using AI for and answer a few quick questions.
            You&apos;ll get a clear recommendation — grounded in recognized standards and your
            organization&apos;s policy. The Co-Pilot advises; you decide.
          </Typography>
        </Box>

        <CopilotForm />
      </Box>
    </Container>
  );
}
