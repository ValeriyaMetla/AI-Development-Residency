import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CopilotForm from './copilot-form';

/**
 * Governance Co-Pilot route (Presentation layer, Epic 4 / ADR-0010). Renders the "should we use
 * AI for this?" flow. The session guard, <main> landmark, and navigation come from the shared
 * app shell (app/(app)/layout.tsx). No logic here — a pure view (ADR-0003 Leak Test).
 */
export default function CopilotPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
  );
}
