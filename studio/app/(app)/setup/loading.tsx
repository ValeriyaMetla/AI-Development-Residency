import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/setup` (Get set up) — a visible indicator while the onboarding state loads,
 * never a blank screen. Next renders this during navigation to the route.
 */
export default function SetupLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Get set up
      </Typography>
      <LinearProgress aria-label="Loading setup" />
    </Box>
  );
}
