import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';

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
          Helping small nonprofits use AI safely and fairly — start from your own rules, run
          governed tasks, and keep a trustworthy record.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component={NextLink} href="/signup" variant="contained" size="large">
            Get started
          </Button>
          <Button component={NextLink} href="/login" variant="text" size="large">
            Log in
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
