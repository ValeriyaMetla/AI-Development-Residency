import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { FeatureList, type Feature } from './feature-list';

/**
 * Landing-page "Who it's for" (section 4 of 7).
 *
 * The two real product roles (Accountable Leader, Frontline Doer — role-aware throughout the app)
 * and the audience from the locked positioning (small, mission-driven orgs without an AI specialist).
 * No overclaiming. Presentation only — no data access, so the Leak Test holds.
 */

const ITEMS: readonly Feature[] = [
  {
    title: 'The person in charge',
    body: "Set your organization's AI rules in minutes and stay in control — you have the final say, and your rules apply to everyone's AI use automatically.",
  },
  {
    title: 'The people doing the work',
    body: 'Get safe AI help for everyday tasks — thank-yous, updates, summaries — with the guardrails built in, so you can use AI in the open instead of quietly carrying the risk.',
  },
  {
    title: 'No AI expertise required',
    body: "You don't need to know AI policy or compliance. Recognized standards are built in, and the guidance is in plain language.",
  },
] as const;

export function WhoItsFor() {
  return (
    <Box
      component="section"
      aria-labelledby="who-its-for-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}
    >
      <Container maxWidth="md">
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          Who it&rsquo;s for
        </Typography>
        <Typography
          id="who-its-for-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          Made for mission-driven teams, not AI experts
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
        >
          Built for small nonprofits and community organizations that want to use AI responsibly —
          without hiring a specialist.
        </Typography>
        <FeatureList items={ITEMS} />
      </Container>
    </Box>
  );
}
