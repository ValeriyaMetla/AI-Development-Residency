import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/dashboard/usage/mine` (My entries) — a visible indicator while the entries
 * load, never a blank screen. Next renders this during navigation to the route.
 */
export default function MyEntriesLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        My entries
      </Typography>
      <LinearProgress aria-label="Loading your entries" />
    </Box>
  );
}
