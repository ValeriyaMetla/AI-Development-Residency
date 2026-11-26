import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/policy-seed` (AI Policy) — a visible indicator while the policy and setup
 * state load, never a blank screen. Next renders this during navigation to the route.
 */
export default function PolicySeedLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        AI Policy
      </Typography>
      <LinearProgress aria-label="Loading your AI policy" />
    </Box>
  );
}
