import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { allDemoRuns } from '@/lib/demo/demo-run';
import { buildDemoPolicy, buildDemoRecord, demoPendingReview } from '@/lib/demo/demo-views';
import { DEMO_CLOSING, DEMO_CTA, DEMO_INTRO, DEMO_RUN_COPY } from './demo-content';
import { GovernedRun } from './governed-run';
import { DemoPolicy, DemoRecord, DemoReview } from './readonly-views';

/**
 * The no-login demo (ADR-0029). Rendered as a static page: no data, auth or model call. Every
 * value is worked out here, on the server, by the real Domain code, and handed to the sections as
 * finished data: the governed runs (T5), then the policy, the run waiting for review and the
 * record (T6), in the order the product's own lifecycle runs.
 */
export default function DemoPage() {
  const runs = allDemoRuns();
  const policy = buildDemoPolicy();
  const pending = demoPendingReview();
  const record = buildDemoRecord();
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

      <Container
        maxWidth="md"
        sx={{ display: 'grid', gap: { xs: 6, md: 9 }, pb: { xs: 6, md: 9 } }}
      >
        <DemoPolicy doc={policy} />
        {pending && <DemoReview run={pending} />}
        <DemoRecord lines={record} />
      </Container>

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
