import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function Home() {
  return (
    <Container maxWidth="sm">
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          py: 8,
        }}
      >
        <Typography variant="h3" component="h1">
          Community AI Workflow Studio
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Helping small nonprofits use AI safely and fairly. This is the Phase 0
          scaffold — the walking skeleton comes next.
        </Typography>
        <Box>
          <Button variant="contained">Get started</Button>
        </Box>
      </Box>
    </Container>
  );
}
