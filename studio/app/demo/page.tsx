import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { DEMO_CLOSING, DEMO_CTA, DEMO_INTRO } from './demo-content';

/**
 * The no-login demo's first screen (ADR-0029 T4). Presentation only, rendered as a static page:
 * no data, auth or model call. The governed run (T5) and the policy, approval and audit-trail
 * views (T6) are added below the intro.
 */
export default function DemoPage() {
  return (
    <>
      <Box component="section" aria-labelledby="demo-heading" sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">
          <Typography
            id="demo-heading"
            variant="h3"
            component="h1"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, lineHeight: 1.15 }}
          >
            {DEMO_INTRO.heading}
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
          >
            {DEMO_INTRO.body}
          </Typography>
        </Container>
      </Box>

      <Box
        component="section"
        aria-labelledby="demo-closing-heading"
        sx={{
          py: { xs: 6, md: 8 },
          bgcolor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="md">
          <Typography
            id="demo-closing-heading"
            variant="h5"
            component="h2"
            sx={{ fontWeight: 700 }}
          >
            {DEMO_CLOSING.heading}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            {DEMO_CLOSING.body}
          </Typography>
          <Button
            component={NextLink}
            href="/signup"
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
          >
            {DEMO_CTA.signUp}
          </Button>
        </Container>
      </Box>
    </>
  );
}
