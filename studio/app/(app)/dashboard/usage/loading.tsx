import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/dashboard/usage` (Monitoring) — a visible indicator while the usage data
 * loads, never a blank screen. Next renders this during navigation to the route.
 */
export default function UsageLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Monitoring
      </Typography>
      <LinearProgress aria-label="Loading monitoring" />
    </Box>
  );
}
