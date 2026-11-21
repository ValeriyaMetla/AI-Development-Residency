import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/report` (US4) — a visible indicator while the trail loads, never a blank page.
 * Next renders this during navigation to the route.
 */
export default function ReportLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Audit Trail
      </Typography>
      <LinearProgress aria-label="Loading the audit trail" />
    </Box>
  );
}
