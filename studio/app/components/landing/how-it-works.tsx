import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

/**
 * Landing-page "How it works" (section 2 of 7).
 *
 * A three-step flow that backs the hero's "about five minutes" promise. Copy is limited to what
 * Release 1b actually ships (policy seed → governed Skills → a checked, labeled, recorded run); every
 * claim maps to a real mechanism, no overclaiming (no Justice Layer, no full human review, no funder
 * export). Presentation only — no data access, so the Leak Test trivially holds.
 *
 * Accessibility: the steps are a real ordered list (<ol>), so a screen reader announces the sequence
 * and its length; the number badge is decorative (aria-hidden) and the meaning lives in the step
 * heading + text, never in the visual order alone. Headings nest h2 (section) → h3 (each step) under
 * the hero's h1.
 */

const STEPS = [
  {
    title: 'Set your rules once',
    body: "Answer a few plain questions and we'll draft a starter AI policy grounded in recognized standards. About five minutes — and you can change it anytime.",
  },
  {
    title: 'Your team drafts real work',
    body: 'Everyday tasks — donor thank-yous, program updates, summaries — run as governed Skills. Your team always gets a draft to review, never an unchecked auto-send.',
  },
  {
    title: 'Every run is checked and recorded',
    body: 'Personal details are stripped before anything goes to the AI, your rules are applied, anything risky goes to a person to approve, and every result is labeled AI-assisted — with a record you can look back on.',
  },
] as const;

export function HowItWorks() {
  return (
    <Box
      component="section"
      aria-labelledby="how-it-works-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}
    >
      <Container maxWidth="md">
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          Three steps
        </Typography>

        <Typography
          id="how-it-works-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          How it works
        </Typography>

        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, maxWidth: '40rem' }}
        >
          From rules to real work in about five minutes — then it runs quietly in the background.
        </Typography>

        <Box
          component="ol"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {STEPS.map((step, i) => (
            <Box
              component="li"
              key={step.title}
              sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start' }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                }}
              >
                {i + 1}
              </Box>
              <Box>
                <Typography variant="h6" component="h3">
                  {step.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {step.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
