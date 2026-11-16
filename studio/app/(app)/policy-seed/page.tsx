import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PolicySeedWizard from './policy-seed-wizard';

/**
 * Policy-seed intake route (Presentation layer). Renders the guided wizard. The session guard,
 * <main> landmark, and navigation come from the shared app shell (app/(app)/layout.tsx). The
 * "org already has a policy" gate is a later sub-task; this page just hosts the flow.
 */
export default function PolicySeedPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
  );
}
