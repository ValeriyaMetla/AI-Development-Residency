import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/dashboard` (Home) — a visible indicator while the page's data loads, never a
 * blank screen. Next renders this during navigation to the route.
 */
export default function DashboardLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Home
      </Typography>
      <LinearProgress aria-label="Loading your home page" />
    </Box>
  );
}
