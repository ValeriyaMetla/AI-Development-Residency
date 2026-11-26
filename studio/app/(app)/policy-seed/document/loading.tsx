import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/policy-seed/document` — a visible indicator while the policy document loads,
 * never a blank screen. The real page title is the loaded document's name, so this uses a static
 * heading. Next renders this during navigation to the route.
 */
export default function PolicyDocumentLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Policy document
      </Typography>
      <LinearProgress aria-label="Loading the policy document" />
    </Box>
  );
}
