import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { allDemoRuns } from '@/lib/demo/demo-run';
import { DEMO_LANDING_COPY } from '../../demo/demo-content';
import { GovernedRun } from '../../demo/governed-run';

/**
 * Landing-page "Try it" section (ADR-0029, clarification 3): the demo's governed run, right after
 * the hero, so visitors can preview the safety net before signing up.
 *
 * Same rules as `/demo`: the runs are worked out here on the server by the real safety code and
 * passed to the picker as finished data; no database, model or session. The `demo-is-offline`
 * arch-gate rule targets this file too.
 *
 * The `/demo` banner isn't on this page, so the section carries its own always-visible label. Its
 * meaning is in its words; the amber border only supports them. The flagged run's review link
 * goes to the full demo, since this page has no review section.
 */
export function TryDemo() {
  const runs = allDemoRuns();
  return (
    <Box
      component="section"
      aria-labelledby="try-demo-heading"
      sx={{ py: { xs: 8, md: 11 }, borderTop: 1, borderColor: 'divider' }}
    >
      <Container maxWidth="md">
        <Typography
          id="try-demo-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.875rem', md: '2.5rem' }, lineHeight: 1.2 }}
        >
          {DEMO_LANDING_COPY.heading}
        </Typography>
        <Typography
          component="p"
          variant="body2"
          sx={{
            display: 'inline-block',
            mt: 2,
            px: 1.5,
            py: 0.5,
            border: 2,
            borderColor: 'warning.main',
            borderRadius: 1,
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {DEMO_LANDING_COPY.label}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2, mb: 4 }}>
          {DEMO_LANDING_COPY.intro}
        </Typography>

        <GovernedRun
          runs={runs}
          reviewLink={{ href: '/demo#demo-review', label: DEMO_LANDING_COPY.reviewLink }}
        />

        <Typography variant="body1" sx={{ mt: 4, fontWeight: 500 }}>
          <Link component={NextLink} href="/demo">
            {DEMO_LANDING_COPY.fullDemo}
            <Box component="span" aria-hidden="true" sx={{ ml: 0.75 }}>
              →
            </Box>
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
