import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

/**
 * Loading state for `/skills` — a visible indicator while the Skills and policy guidance load,
 * never a blank screen. Next renders this during navigation to the route.
 */
export default function SkillsLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1">
        Skills
      </Typography>
      <LinearProgress aria-label="Loading Skills" />
    </Box>
  );
}
