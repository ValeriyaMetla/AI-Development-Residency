import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { FeatureList, type Feature } from './feature-list';

/**
 * Landing-page "The safety net" (section 3 of 7).
 *
 * Every point maps to a mechanism Release 1b actually ships (PII strip before the model, the
 * deterministic rule-check, risky-use → human approval, provenance + the append-only record). No
 * overclaiming: it is NOT "every output is human-reviewed" (only flagged runs go to a person), and
 * there is no Justice Layer (MMP). Presentation only — no data access, so the Leak Test holds.
 */

const ITEMS: readonly Feature[] = [
  {
    title: 'Personal details are stripped first',
    body: 'Names, emails, phone numbers and other personal information are removed before anything reaches the AI — and you can deliberately keep something when a task truly needs it, with that choice recorded.',
  },
  {
    title: 'Every draft is checked against your rules',
    body: "Your organization's policy is applied to each run, so what comes back follows the rules you set — automatically, with no one wiring it up.",
  },
  {
    title: 'Risky tasks go to a person',
    body: 'Anything high-stakes — like a decision about someone, or a health, legal, or safety matter — is flagged and waits for a person to approve it before it can be used.',
  },
  {
    title: 'Everything is labeled and recorded',
    body: 'Each result is clearly marked AI-assisted, and every run is written to a plain-language record you can look back on.',
  },
] as const;

export function SafetyNet() {
  return (
    <Box
      component="section"
      aria-labelledby="safety-net-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="md">
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          The safety net
        </Typography>
        <Typography
          id="safety-net-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          A safety net around every task
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
        >
          Protection runs automatically on every AI task — even before you&rsquo;ve written a single
          rule.
        </Typography>
        <FeatureList items={ITEMS} />
      </Container>
    </Box>
  );
}
