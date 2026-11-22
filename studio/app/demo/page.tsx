import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { allDemoRuns } from '@/lib/demo/demo-run';
import { DEMO_CLOSING, DEMO_CTA, DEMO_INTRO, DEMO_RUN_COPY } from './demo-content';
import { GovernedRun } from './governed-run';

/**
 * The no-login demo's first screen (ADR-0029). Rendered as a static page: no data, auth or model
 * call. The governed runs are worked out here, on the server, by the real safety code (T5), and
 * handed to the picker as finished data. The policy, approval and audit-trail views (T6) follow.
 */
export default function DemoPage() {
  const runs = allDemoRuns();
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

      <Box component="section" aria-labelledby="demo-run-heading" sx={{ pb: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">
          <Typography
            id="demo-run-heading"
            variant="h5"
            component="h2"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            {DEMO_RUN_COPY.heading}
          </Typography>
          <GovernedRun runs={runs} />
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
