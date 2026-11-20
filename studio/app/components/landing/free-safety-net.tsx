import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { FeatureList, type Feature } from './feature-list';

/**
 * Landing-page "Free safety net" (section 6 of 7).
 *
 * The free-tier promise from ADR-0023: the whole safety net is free forever; only capacity is paid;
 * safety never switches off, even at the free limit. Billing itself is out of scope, so no pricing
 * claim is made. Presentation only — no data access, so the Leak Test holds.
 */

const ITEMS: readonly Feature[] = [
  {
    title: 'The full safety net is free',
    body: 'Rule checks, personal-data protection, human approval for risky tasks, and AI-assisted labeling — free for every organization.',
  },
  {
    title: 'Only capacity is paid',
    body: 'If you need to run more, that is the part you pay for. The protection is never the paid part.',
  },
  {
    title: 'Safety never switches off',
    body: 'Even if you reach the free limit, the safety net keeps running — cost is never the reason an organization goes ungoverned.',
  },
] as const;

export function FreeSafetyNet() {
  return (
    <Box
      component="section"
      aria-labelledby="free-safety-net-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}
    >
      <Container maxWidth="md">
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          Free forever
        </Typography>
        <Typography
          id="free-safety-net-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          The safety net is free — always
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
        >
          Cost should never be the reason an organization uses AI without guardrails.
        </Typography>
        <FeatureList items={ITEMS} />
      </Container>
    </Box>
  );
}
