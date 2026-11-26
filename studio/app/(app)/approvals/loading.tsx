import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/approvals` (Human Review) — a visible indicator while items for review load,
 * never a blank screen. Next renders this during navigation to the route.
 */
export default function ApprovalsLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Human Review
      </Typography>
      <LinearProgress aria-label="Loading items for review" />
    </Box>
  );
}
