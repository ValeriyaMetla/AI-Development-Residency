import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { FeatureList, type Feature } from './feature-list';

/**
 * Landing-page "Standards" (section 5 of 7).
 *
 * The three frameworks the standards library is actually seeded from (ADR-0008) and that the policy
 * rules + Co-Pilot cite by code. The "every rule cites its source" claim is real (snapshotted
 * citations on each policy rule). Presentation only — no data access, so the Leak Test holds.
 */

const ITEMS: readonly Feature[] = [
  {
    title: 'NIST AI Risk Management Framework',
    body: 'The U.S. framework for identifying and managing the risks of AI responsibly.',
  },
  {
    title: 'EU AI Act',
    body: "The European Union's risk-based rules for how AI systems may be used.",
  },
  {
    title: 'ISO/IEC 42001',
    body: 'The international standard for managing AI within an organization.',
  },
] as const;

export function Standards() {
  return (
    <Box
      component="section"
      aria-labelledby="standards-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="md">
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          Grounded in standards
        </Typography>
        <Typography
          id="standards-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          Your rules, grounded in recognized standards
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
        >
          This isn&rsquo;t our opinion of what&rsquo;s safe. Your policy is built from the
          frameworks funders and regulators recognize — and every rule shows the standard it comes
          from.
        </Typography>
        <FeatureList items={ITEMS} />
      </Container>
    </Box>
  );
}
