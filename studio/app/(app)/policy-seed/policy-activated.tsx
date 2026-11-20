import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';

/**
 * Confirmation shown right after a leader activates their policy — from the seed wizard or from a
 * resumed saved draft (Presentation only). Bridges straight to a first governed run instead of a
 * dead-end "it's active" screen (Epic 8 minutes-to-value, Lane D).
 */
export default function PolicyActivated() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        Your AI policy is active
      </Typography>
      <Typography variant="body1" color="text.secondary">
        It now applies to your organization&apos;s AI use. You can revisit and refine it any time.
      </Typography>
      <Box>
        <Button variant="contained" component={NextLink} href="/skills">
          Run your first Skill →
        </Button>
      </Box>
    </Paper>
  );
}
