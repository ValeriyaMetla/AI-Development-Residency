import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

/**
 * Landing-page "Free safety net" (section 6 of 7) — a dark, highlighted callout band that sets this
 * promise apart from the lighter sections around it.
 *
 * The free-tier promise from ADR-0023: the whole safety net is free forever; only capacity is paid;
 * safety never switches off, even at the free limit. Billing itself is out of scope, so no pricing
 * claim is made. Presentation only — no data access, so the Leak Test holds.
 *
 * Accessibility: the points are a real <ul> with <h3> titles. On the dark band, titles use white and
 * body copy uses grey.300 — both clear AA contrast on grey.900. The check icons are aria-hidden.
 */

const ITEMS = [
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

function CheckIcon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: 24, height: 24, color: 'success.light' }}
    >
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
    </Box>
  );
}

export function FreeSafetyNet() {
  return (
    <Box
      component="section"
      aria-labelledby="free-safety-net-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'grey.900', color: 'common.white' }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', maxWidth: '42rem', mx: 'auto' }}>
          <Typography
            component="p"
            variant="overline"
            sx={{ color: 'grey.400', fontWeight: 700, letterSpacing: 1.2 }}
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
          <Typography variant="h6" component="p" sx={{ color: 'grey.300', fontWeight: 400, mt: 2 }}>
            Cost should never be the reason an organization uses AI without guardrails.
          </Typography>
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 3, md: 4 },
          }}
        >
          {ITEMS.map((item) => (
            <Box component="li" key={item.title}>
              <CheckIcon />
              <Typography variant="h6" component="h3" sx={{ mt: 1, color: 'common.white' }}>
                {item.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'grey.300', mt: 0.5 }}>
                {item.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
